import json
import os
import urllib.request
import urllib.parse
import psycopg2
from psycopg2.extras import RealDictCursor

def get_db_connection():
    """Создаёт подключение к базе данных"""
    return psycopg2.connect(os.environ['DATABASE_URL'])

def get_steam_price(item_hash_name: str) -> float:
    """Получает актуальную цену предмета из Steam Market"""
    try:
        price_url = f'https://steamcommunity.com/market/priceoverview/?appid=730&currency=5&market_hash_name={urllib.parse.quote(item_hash_name)}'
        
        req = urllib.request.Request(price_url)
        req.add_header('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36')
        
        with urllib.request.urlopen(req, timeout=10) as response:
            data = json.loads(response.read().decode('utf-8'))
        
        print(f"Steam API response for {item_hash_name}: {data}")
        
        if data.get('success'):
            lowest_price = data.get('lowest_price', '')
            if lowest_price:
                import re
                price_match = re.search(r'[\d\s]+[,\.]?\d*', lowest_price)
                if price_match:
                    price_str = price_match.group(0).replace(' ', '').replace(',', '.')
                    try:
                        price_rub = float(price_str)
                        print(f"Parsed price: {price_rub}₽")
                        return price_rub
                    except ValueError:
                        print(f"Failed to parse price: {price_str}")
                        return None
        
        print(f"No valid price found in response")
        return None
    except Exception as e:
        print(f"Error fetching price for {item_hash_name}: {e}")
        return None

def handler(event: dict, context) -> dict:
    """API для обновления цен всех активных треков"""
    method = event.get('httpMethod', 'GET')

    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-Steam-Id'
            },
            'body': '',
            'isBase64Encoded': False
        }

    if method != 'POST':
        return {
            'statusCode': 405,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': 'Method not allowed'}),
            'isBase64Encoded': False
        }

    steam_id = event.get('headers', {}).get('X-Steam-Id') or event.get('headers', {}).get('x-steam-id')
    
    if not steam_id:
        return {
            'statusCode': 401,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': 'Authentication required'}),
            'isBase64Encoded': False
        }

    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        cur.execute(
            f"SELECT id FROM {os.environ['MAIN_DB_SCHEMA']}.users WHERE steam_id = %s",
            (steam_id,)
        )
        user = cur.fetchone()
        
        if not user:
            cur.execute(
                f"INSERT INTO {os.environ['MAIN_DB_SCHEMA']}.users (steam_id, username) VALUES (%s, %s) RETURNING id",
                (steam_id, f'User{steam_id[-4:]}')
            )
            user = cur.fetchone()
            conn.commit()
        
        user_id = user['id']

        cur.execute(
            f"SELECT id, item_hash_name, current_price, target_price FROM {os.environ['MAIN_DB_SCHEMA']}.tracks WHERE user_id = %s AND status = 'active'",
            (user_id,)
        )
        tracks = cur.fetchall()

        updated_count = 0
        price_drops = []
        errors = []

        for track in tracks:
            new_price = get_steam_price(track['item_hash_name'])
            
            if new_price is not None:
                old_price = float(track['current_price']) if track['current_price'] else 0
                
                cur.execute(
                    f"""
                    UPDATE {os.environ['MAIN_DB_SCHEMA']}.tracks 
                    SET current_price = %s, updated_at = CURRENT_TIMESTAMP
                    WHERE id = %s
                    """,
                    (new_price, track['id'])
                )
                updated_count += 1

                if new_price <= float(track['target_price']):
                    price_drops.append({
                        'track_id': track['id'],
                        'item_name': track['item_hash_name'],
                        'old_price': old_price,
                        'new_price': new_price,
                        'target_price': float(track['target_price'])
                    })
            else:
                errors.append({
                    'track_id': track['id'],
                    'item_name': track['item_hash_name'],
                    'error': 'Failed to fetch price'
                })

        conn.commit()

        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'updated': updated_count,
                'total': len(tracks),
                'price_drops': price_drops,
                'errors': errors
            }),
            'isBase64Encoded': False
        }

    except Exception as e:
        if conn:
            conn.rollback()
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': str(e)}),
            'isBase64Encoded': False
        }
    finally:
        if conn:
            cur.close()
            conn.close()