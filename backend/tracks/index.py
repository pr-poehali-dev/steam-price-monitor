import json
import os
import psycopg2
from psycopg2.extras import RealDictCursor

def get_db_connection():
    """Создаёт подключение к базе данных"""
    return psycopg2.connect(os.environ['DATABASE_URL'])

def handler(event: dict, context) -> dict:
    """API для управления треками пользователя"""
    method = event.get('httpMethod', 'GET')

    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-Steam-Id'
            },
            'body': '',
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
        
        # Специальный путь для сохранения Steam credentials
        path = event.get('path', '')
        print(f"Method: {method}, Path: {path}, Steam ID: {steam_id}")
        if method == 'PUT' and 'steam-credentials' in path:
            body = json.loads(event.get('body', '{}'))
            
            update_fields = []
            values = []
            
            if 'steam_cookie' in body:
                update_fields.append('steam_cookie = %s')
                values.append(body['steam_cookie'])
            if 'steam_session_id' in body:
                update_fields.append('steam_session_id = %s')
                values.append(body['steam_session_id'])
            
            if update_fields:
                values.append(steam_id)
                cur.execute(
                    f"UPDATE {os.environ['MAIN_DB_SCHEMA']}.users SET {', '.join(update_fields)} WHERE steam_id = %s",
                    values
                )
                conn.commit()
                
                return {
                    'statusCode': 200,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'body': json.dumps({'success': True}),
                    'isBase64Encoded': False
                }
        
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

        if method == 'GET':
            track_id = event.get('queryStringParameters', {}).get('id')
            
            if track_id:
                cur.execute(
                    f"SELECT * FROM {os.environ['MAIN_DB_SCHEMA']}.tracks WHERE id = %s AND user_id = %s",
                    (track_id, user_id)
                )
                track = cur.fetchone()
                
                if not track:
                    return {
                        'statusCode': 404,
                        'headers': {
                            'Content-Type': 'application/json',
                            'Access-Control-Allow-Origin': '*'
                        },
                        'body': json.dumps({'error': 'Track not found'}),
                        'isBase64Encoded': False
                    }
                
                return {
                    'statusCode': 200,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'body': json.dumps(dict(track), default=str),
                    'isBase64Encoded': False
                }
            else:
                cur.execute(
                    f"SELECT * FROM {os.environ['MAIN_DB_SCHEMA']}.tracks WHERE user_id = %s ORDER BY created_at DESC",
                    (user_id,)
                )
                tracks = cur.fetchall()
                
                return {
                    'statusCode': 200,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'body': json.dumps([dict(t) for t in tracks], default=str),
                    'isBase64Encoded': False
                }

        elif method == 'POST':
            body = json.loads(event.get('body', '{}'))
            
            required_fields = ['item_name', 'item_hash_name', 'target_price']
            if not all(field in body for field in required_fields):
                return {
                    'statusCode': 400,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'body': json.dumps({'error': 'Missing required fields'}),
                    'isBase64Encoded': False
                }

            cur.execute(
                f"""
                INSERT INTO {os.environ['MAIN_DB_SCHEMA']}.tracks 
                (user_id, item_name, item_hash_name, item_image, current_price, target_price, status)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                RETURNING *
                """,
                (
                    user_id,
                    body['item_name'],
                    body['item_hash_name'],
                    body.get('item_image'),
                    body.get('current_price'),
                    body['target_price'],
                    body.get('status', 'active')
                )
            )
            
            new_track = cur.fetchone()
            conn.commit()
            
            return {
                'statusCode': 201,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps(dict(new_track), default=str),
                'isBase64Encoded': False
            }

        elif method == 'PUT':
            track_id = event.get('queryStringParameters', {}).get('id')
            body = json.loads(event.get('body', '{}'))
            
            if not track_id:
                return {
                    'statusCode': 400,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'body': json.dumps({'error': 'Track ID is required'}),
                    'isBase64Encoded': False
                }

            update_fields = []
            values = []
            
            if 'current_price' in body:
                update_fields.append('current_price = %s')
                values.append(body['current_price'])
            if 'target_price' in body:
                update_fields.append('target_price = %s')
                values.append(body['target_price'])
            if 'status' in body:
                update_fields.append('status = %s')
                values.append(body['status'])
            if 'auto_purchase' in body:
                update_fields.append('auto_purchase = %s')
                values.append(body['auto_purchase'])
            
            update_fields.append('updated_at = CURRENT_TIMESTAMP')
            
            values.extend([track_id, user_id])
            
            cur.execute(
                f"""
                UPDATE {os.environ['MAIN_DB_SCHEMA']}.tracks 
                SET {', '.join(update_fields)}
                WHERE id = %s AND user_id = %s
                RETURNING *
                """,
                values
            )
            
            updated_track = cur.fetchone()
            conn.commit()
            
            if not updated_track:
                return {
                    'statusCode': 404,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'body': json.dumps({'error': 'Track not found'}),
                    'isBase64Encoded': False
                }
            
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps(dict(updated_track), default=str),
                'isBase64Encoded': False
            }

        elif method == 'DELETE':
            track_id = event.get('queryStringParameters', {}).get('id')
            
            if not track_id:
                return {
                    'statusCode': 400,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'body': json.dumps({'error': 'Track ID is required'}),
                    'isBase64Encoded': False
                }

            cur.execute(
                f"DELETE FROM {os.environ['MAIN_DB_SCHEMA']}.tracks WHERE id = %s AND user_id = %s RETURNING id",
                (track_id, user_id)
            )
            
            deleted = cur.fetchone()
            conn.commit()
            
            if not deleted:
                return {
                    'statusCode': 404,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'body': json.dumps({'error': 'Track not found'}),
                    'isBase64Encoded': False
                }
            
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'message': 'Track deleted successfully'}),
                'isBase64Encoded': False
            }

        return {
            'statusCode': 405,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': 'Method not allowed'}),
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