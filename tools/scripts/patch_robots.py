"""Update robots.txt to add sitemap reference."""
path = r'c:\Users\Amrab\Downloads\noor-adhkar\public\robots.txt'
content = open(path, 'r', encoding='utf-8').read().strip()
new_content = content + '\nSitemap: https://www.athark.org/sitemap.xml\n'
open(path, 'w', encoding='utf-8').write(new_content)
print('Updated robots.txt')
print(open(path).read())
