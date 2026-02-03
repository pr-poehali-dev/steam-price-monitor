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

def purchase_item(item_hash_name: str, price: float, steam_cookie: str, session_id: str) -> dict:
    """Создает заявку на покупку предмета на Steam Market"""
    try:
        purchase_url = 'https://steamcommunity.com/market/createbuyorder/'
        
        purchase_data = {
            'sessionid': session_id,
            'currency': 5,
            'appid': 730,
            'market_hash_name': item_hash_name,
            'price_total': int(price * 100),
            'quantity': 1
        }
        
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'Cookie': f'steamLoginSecure={steam_cookie}; sessionid={session_id}',
            'Referer': f'https://steamcommunity.com/market/listings/730/{urllib.parse.quote(item_hash_name)}',
            'Origin': 'https://steamcommunity.com'
        }
        
        data = urllib.parse.urlencode(purchase_data).encode('utf-8')
        req = urllib.request.Request(purchase_url, data=data, headers=headers, method='POST')
        
        with urllib.request.urlopen(req, timeout=15) as response:
            result = json.loads(response.read().decode('utf-8'))
        
        print(f"Purchase response for {item_hash_name}: {result}")
        return result
    except Exception as e:
        print(f"Error purchasing {item_hash_name}: {e}")
        return {'success': 0, 'message': str(e)}

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
            f"SELECT id, steam_cookie, steam_session_id FROM {os.environ['MAIN_DB_SCHEMA']}.users WHERE steam_id = %s",
            (steam_id,)
        )
        user = cur.fetchone()
        
        if not user:
            cur.execute(
                f"INSERT INTO {os.environ['MAIN_DB_SCHEMA']}.users (steam_id, username) VALUES (%s, %s) RETURNING id, steam_cookie, steam_session_id",
                (steam_id, f'User{steam_id[-4:]}')
            )
            user = cur.fetchone()
            conn.commit()
        
        user_id = user['id']
        steam_cookie = user['steam_cookie']
        session_id = user['steam_session_id']

        cur.execute(
            f"SELECT id, item_name, item_hash_name, item_image, current_price, target_price, auto_purchase FROM {os.environ['MAIN_DB_SCHEMA']}.tracks WHERE user_id = %s AND status = 'active'",
            (user_id,)
        )
        tracks = cur.fetchall()

        updated_count = 0
        price_drops = []
        purchases_made = []
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
                    
                    # Автопокупка если включена
                    if track.get('auto_purchase') and steam_cookie and session_id:
                        print(f"Auto-purchasing {track['item_hash_name']} at {new_price}₽")
                        
                        purchase_result = purchase_item(
                            track['item_hash_name'],
                            new_price,
                            steam_cookie,
                            session_id
                        )
                        
                        if purchase_result.get('success') == 1:
                            # Сохраняем покупку в БД
                            cur.execute(
                                f"""
                                INSERT INTO {os.environ['MAIN_DB_SCHEMA']}.purchases 
                                (user_id, track_id, item_name, item_hash_name, item_image, purchase_price, buy_order_id, status)
                                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                                """,
                                (user_id, track['id'], track['item_name'], track['item_hash_name'], 
                                 track['item_image'], new_price, purchase_result.get('buy_orderid'), 'completed')
                            )
                            
                            # Обновляем статус трека
                            cur.execute(
                                f"UPDATE {os.environ['MAIN_DB_SCHEMA']}.tracks SET status = 'purchased' WHERE id = %s",
                                (track['id'],)
                            )
                            
                            purchases_made.append({
                                'track_id': track['id'],
                                'item_name': track['item_hash_name'],
                                'price': new_price,
                                'buy_orderid': purchase_result.get('buy_orderid')
                            })
                            
                            print(f"Successfully purchased {track['item_hash_name']}")
                        else:
                            print(f"Failed to purchase {track['item_hash_name']}: {purchase_result.get('message')}")
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
                'purchases_made': purchases_made,
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