import json
import urllib.request
import urllib.parse

def handler(event: dict, context) -> dict:
    """API для получения цены предмета в Steam Market"""
    method = event.get('httpMethod', 'GET')

    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
            },
            'body': '',
            'isBase64Encoded': False
        }

    if method == 'GET':
        item_name = event.get('queryStringParameters', {}).get('item', '')
        
        if not item_name:
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'error': 'Query parameter "item" is required'}),
                'isBase64Encoded': False
            }

        try:
            price_url = f'https://steamcommunity.com/market/priceoverview/?appid=730&currency=1&market_hash_name={urllib.parse.quote(item_name)}'
            
            req = urllib.request.Request(price_url)
            req.add_header('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36')
            
            with urllib.request.urlopen(req, timeout=10) as response:
                data = json.loads(response.read().decode('utf-8'))
            
            print(f"Steam Price API response for {item_name}: {data}")
            
            if data.get('success'):
                lowest_price = data.get('lowest_price', 'N/A')
                price_value = None
                
                if lowest_price != 'N/A':
                    import re
                    price_match = re.search(r'[\d,\.]+', lowest_price)
                    if price_match:
                        price_str = price_match.group(0).replace(',', '')
                        try:
                            price_usd = float(price_str)
                            price_value = price_usd * 95
                            print(f"Converted price: ${price_usd} -> {price_value}₽")
                        except ValueError:
                            print(f"Failed to parse price: {price_str}")
                            price_value = None
                
                return {
                    'statusCode': 200,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'body': json.dumps({
                        'item_name': item_name,
                        'lowest_price': f"{price_value}₽" if price_value else 'N/A',
                        'price_value': price_value,
                        'median_price': data.get('median_price', 'N/A'),
                        'volume': data.get('volume', 'N/A')
                    }),
                    'isBase64Encoded': False
                }
            else:
                return {
                    'statusCode': 404,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'body': json.dumps({'error': 'Item not found'}),
                    'isBase64Encoded': False
                }
        
        except Exception as e:
            return {
                'statusCode': 500,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'error': str(e)}),
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