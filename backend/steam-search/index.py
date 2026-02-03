import json
import urllib.request
import urllib.parse
import re

def is_russian(text: str) -> bool:
    """Проверяет содержит ли текст кириллицу"""
    return bool(re.search('[а-яА-Я]', text))

def translate_weapon_terms(text: str) -> str:
    """Переводит основные игровые термины с русского на английский"""
    translations = {
        'калаш': 'AK-47',
        'ак': 'AK-47',
        'эм4': 'M4A4',
        'м4': 'M4A4',
        'авп': 'AWP',
        'глок': 'Glock-18',
        'usp': 'USP-S',
        'десерт игл': 'Desert Eagle',
        'дигл': 'Desert Eagle',
        'deagle': 'Desert Eagle',
        'нож': 'knife',
        'перчатки': 'gloves',
        'сланец': 'slate',
        'красная линия': 'redline',
        'азимов': 'asiimov',
        'вой': 'howl',
        'дракон': 'dragon lore',
        'неон': 'neon',
        'поблекшие': 'fade',
        'полевые испытания': 'field-tested',
        'прямо с завода': 'factory new',
        'минимальный износ': 'minimal wear',
        'после полевых испытаний': 'well-worn',
        'закалённое в боях': 'battle-scarred',
        'ft': 'field-tested',
        'fn': 'factory new',
        'mw': 'minimal wear',
        'ww': 'well-worn',
        'bs': 'battle-scarred'
    }
    
    text_lower = text.lower()
    for ru, en in translations.items():
        text_lower = text_lower.replace(ru, en)
    
    return text_lower

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
            # Если запрос на русском, переводим на английский
            original_query = query
            if is_russian(query):
                query = translate_weapon_terms(query)
                print(f"Translated '{original_query}' → '{query}'")
            
            search_url = f'https://steamcommunity.com/market/search/render/?query={urllib.parse.quote(query)}&start=0&count=10&search_descriptions=0&sort_column=popular&sort_dir=desc&appid=730&norender=1'
            
            req = urllib.request.Request(search_url)
            req.add_header('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36')
            req.add_header('Accept', 'application/json, text/javascript, */*; q=0.01')
            req.add_header('Accept-Language', 'en-US,en;q=0.9')
            req.add_header('Referer', 'https://steamcommunity.com/market/')
            
            with urllib.request.urlopen(req, timeout=15) as response:
                raw_data = response.read().decode('utf-8')
                data = json.loads(raw_data)
            
            print(f"Search query: {query}")
            print(f"API response success: {data.get('success')}")
            print(f"Results count: {len(data.get('results', []))}")
            
            results = []
            if data.get('success') and data.get('results'):
                for item in data['results'][:10]:
                    icon_url = ''
                    if 'asset_description' in item and 'icon_url' in item['asset_description']:
                        icon_url = item['asset_description']['icon_url']
                    
                    results.append({
                        'name': item.get('name', ''),
                        'hash_name': item.get('hash_name', ''),
                        'image': f"https://community.cloudflare.steamstatic.com/economy/image/{icon_url}" if icon_url else '',
                        'price': item.get('sell_price_text', 'N/A'),
                        'sell_listings': item.get('sell_listings', 0)
                    })
            
            print(f"Formatted results: {len(results)}")
            
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