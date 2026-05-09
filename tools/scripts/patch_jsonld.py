"""Add JSON-LD structured data to index.html for SEO."""
path = r'c:\Users\Amrab\Downloads\noor-adhkar\index.html'
content = open(path, 'r', encoding='utf-8').read()

json_ld = '''    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      "name": "\u0623\u062b\u0631 \u2014 \u0623\u0630\u0643\u0627\u0631 \u0648\u0642\u0631\u0622\u0646 \u0648\u0635\u0644\u0627\u0629",
      "description": "\u062a\u0637\u0628\u064a\u0642 \u0627\u0644\u0623\u0630\u0643\u0627\u0631 \u0627\u0644\u064a\u0648\u0645\u064a\u0629 \u0648\u0627\u0644\u0642\u0631\u0622\u0646 \u0627\u0644\u0643\u0631\u064a\u0645 \u0648\u0645\u0648\u0627\u0642\u064a\u062a \u0627\u0644\u0635\u0644\u0627\u0629. \u0627\u0628\u062f\u0623 \u064a\u0648\u0645\u0643 \u0628\u0630\u0643\u0631 \u0627\u0644\u0644\u0647.",
      "url": "https://www.athark.org",
      "applicationCategory": "LifestyleApplication",
      "applicationSubCategory": "ReligiousApplication",
      "inLanguage": "ar",
      "operatingSystem": "Any",
      "browserRequirements": "Requires JavaScript",
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "USD"
      },
      "author": {
        "@type": "Organization",
        "name": "\u0623\u062b\u0631"
      },
      "featureList": [
        "\u0623\u0630\u0643\u0627\u0631 \u0627\u0644\u0635\u0628\u0627\u062d \u0648\u0627\u0644\u0645\u0633\u0627\u0621",
        "\u0642\u0631\u0627\u0621\u0629 \u0627\u0644\u0642\u0631\u0622\u0646 \u0627\u0644\u0643\u0631\u064a\u0645",
        "\u0645\u0648\u0627\u0642\u064a\u062a \u0627\u0644\u0635\u0644\u0627\u0629",
        "\u0627\u062a\u062c\u0627\u0647 \u0627\u0644\u0642\u0628\u0644\u0629",
        "\u062a\u0633\u0628\u064a\u062d \u0631\u0642\u0645\u064a",
        "\u0643\u062a\u0628 \u0627\u0644\u062d\u062f\u064a\u062b \u0627\u0644\u0646\u0628\u0648\u064a",
        "\u0623\u0633\u0645\u0627\u0621 \u0627\u0644\u0644\u0647 \u0627\u0644\u062d\u0633\u0646\u0649"
      ]
    }
    </script>
'''

old = '    <title>\u0623\u062b\u0631 \u2014 \u0623\u0630\u0643\u0627\u0631 \u0648\u0642\u0631\u0622\u0646 \u0648\u0635\u0644\u0627\u0629</title>\n  </head>'
new = '    <title>\u0623\u062b\u0631 \u2014 \u0623\u0630\u0643\u0627\u0631 \u0648\u0642\u0631\u0622\u0646 \u0648\u0635\u0644\u0627\u0629</title>\n' + json_ld + '  </head>'

if old in content:
    content = content.replace(old, new, 1)
    open(path, 'w', encoding='utf-8').write(content)
    print('PATCHED: JSON-LD structured data added')
else:
    print('NOT_FOUND')
