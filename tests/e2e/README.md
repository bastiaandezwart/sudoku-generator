# Browsertests (Playwright)

Losse scripts die Puzzelpret (`kids.html`) in headless Chromium doorspelen. Playwright en Chromium
staan klaar in de cloudomgeving (`require('playwright')` werkt overal; niet opnieuw installeren).

Draaien vanuit de root van de repository, met een map voor screenshots:

    node tests/e2e/parent-check.js /tmp/shots   # ouderscherm: "denker" vs "gokker"
    node tests/e2e/split-check.js /tmp/shots    # stickers 4x4/6x6, plakken, tabbladen, migratie
    node tests/e2e/follow-check.js /tmp/shots   # camera volgt de sticker tijdens het plakken

Elk script print zijn bevindingen en `errors []` als er geen paginafouten waren.
Let op: een *element*-screenshot van `#book` laat in headless soms de getekende reservekaft zien
in plaats van het kaftplaatje (3D-transforms). Gebruik dan een screenshot van de hele pagina.
