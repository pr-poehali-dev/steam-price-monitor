import json
import urllib.request
import urllib.parse

def handler(event: dict, context) -> dict:
    """API для поиска предметов в Steam Market"""
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
        query = event.get('queryStringParameters', {}).get('q', '')
        
        if not query:
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'error': 'Query parameter "q" is required'}),
                'isBase64Encoded': False
            }

        try:
            search_url = f'https://steamcommunity.com/market/search/render/?query={urllib.parse.quote(query)}&start=0&count=10&search_descriptions=0&sort_column=popular&sort_dir=desc&appid=730&norender=1'
            
            req = urllib.request.Request(search_url)
            req.add_header('User-Agent', 'Mozilla/5.0')
            
            with urllib.request.urlopen(req, timeout=10) as response:
                data = json.loads(response.read().decode('utf-8'))
            
            results = []
            if data.get('success') and data.get('results'):
                for item in data['results'][:10]:
                    results.append({
                        'name': item.get('name', ''),
                        'hash_name': item.get('hash_name', ''),
                        'image': f"https://community.cloudflare.steamstatic.com/economy/image/{item.get('asset_description', {}).get('icon_url', '')}",
                        'price': item.get('sell_price_text', 'N/A'),
                        'sell_listings': item.get('sell_listings', 0)
                    })
            
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'results': results,
                    'total': len(results)
                }),
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
