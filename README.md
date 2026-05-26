# LinkedIn's Browsergate Extension Scan Defense Kit

<details>
<summary><b>English</b></summary>

## Context

In February 2026, [Fairlinked](https://fairlinked.eu)'s investigation revealed that LinkedIn deploys a ~2.7 MB JavaScript bundle that:

- Contains 6,222 hardcoded Chrome extension IDs
- Fires ~6,222 simultaneous `fetch()` calls to `chrome-extension://` URLs to detect installed extensions
- Scans the DOM for extension references
- Collects 48 browser fingerprinting characteristics (WebRTC, canvas, WebGL, fonts, battery, etc.)
- Sends everything to `li/track`, `/platform-telemetry/li/apfcDf` and `/apfc/collect` endpoints
- Encrypts payloads with RSA to prevent network inspection
- **Does not request user consent or mention this in its privacy policy**

A sworn affidavit from Milinda Lakkam (LinkedIn's Senior Manager of Software Engineering) admits to these "extension detection mechanisms".

## Contents

### 1. `blocker-extension/` — Passive blocker (Chrome Extension)

Blocks scanning before it happens.

**What it does:**
- Intercepts and blocks `fetch()` calls to `chrome-extension://`
- Blocks LinkedIn's 3 telemetry endpoints via declarativeNetRequest
- Neutralizes passive DOM scanning (TreeWalker override)
- Blocks HUMAN Security/PerimeterX hidden iframe (`li.protechts.net`)
- Blocks fingerprinting script from `merchantpool1.linkedin.com`

**Installation:**
1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **Developer mode** (top right corner)
3. Click **Load unpacked**
4. Select the `blocker-extension/` folder
5. Done. The icon will appear in your extensions bar

**Verification:**
- Open LinkedIn with DevTools (F12) > Network
- You should see no requests to `li/track` or `chrome-extension://`

### 2. `poisoner.py` — Data poisoner

Sends fake extension data to LinkedIn's telemetry endpoints to degrade their fingerprinting database.

**Requirements:**
```bash
pip install requests
```

**Basic usage:**
```bash
python poisoner.py --cookie "YOUR_li_at_COOKIE" --rounds 50 --verbose
```

**Get your `li_at` cookie:**
1. Open LinkedIn in your browser
2. F12 > Application > Cookies > `www.linkedin.com`
3. Copy the `li_at` value

**Parameters:**

| Parameter     | Default | Description                                      |
|---------------|---------|--------------------------------------------------|
| `--cookie`    | —       | **(required)** `li_at` session cookie             |
| `--rounds`    | 50      | Number of sending rounds                          |
| `--batch-size`| 30      | Fake extensions per round                         |
| `--delay`     | 3.0     | Base delay between rounds in seconds (+/- 50% random) |
| `--verbose`   | off     | Show detailed request info                        |

**What it sends:**
- Random extension IDs in valid Chrome Web Store format (32 lowercase chars)
- Payloads mimicking `AedEvent` and `SpectroscopyEvent`
- Realistic random browser fingerprints
- Rotating User-Agents
- Organic delays between requests

### 3. `flooder-extension/` — Active flooder (Chrome Extension)

Everything the blocker does, plus floods LinkedIn's telemetry with fake data on every scan attempt.

### 4. `configurable-flooder/` — Configurable flooder (Chrome Extension)

Same as the flooder but with a popup UI to load custom payloads from a `.txt` file.

## Warnings

### Terms of Service

Using the poisoner or flooders **may violate LinkedIn's Terms of Service**. Specifically:

- Prohibition on sending false or misleading information
- Prohibition on unauthorized automated use of the platform
- Prohibition on interfering with the service

LinkedIn may permanently suspend your account if it detects this activity.

### Legal considerations

- **LinkedIn is collecting data without consent**, which is a potential GDPR violation in the EU and privacy regulations in other jurisdictions
- The legality of responding with data poisoning depends on your local jurisdiction
- This kit is provided for educational and security research purposes
- **You are responsible for how you use these tools**

### Recommendations

- **Use the blocker first** — 100% defensive, zero risk
- If you use the poisoner, do it from an account you don't mind losing
- Consider reporting LinkedIn's behavior to your data protection authority
- Support [Fairlinked](https://fairlinked.eu)'s campaign pursuing this through legal channels

## Risk-free alternatives

1. **Use Firefox** — doesn't allow `fetch()` to `chrome-extension://` by design
2. **Separate profile** — use a Chrome profile with no extensions just for LinkedIn
3. **uBlock Origin** — add these custom rules:
   ```
   ||www.linkedin.com/li/track$xhr
   ||www.linkedin.com/platform-telemetry/*$xhr
   ||www.linkedin.com/apfc/collect$xhr
   ||li.protechts.net^
   ||merchantpool1.linkedin.com^
   ```

## References

- [BrowserGate — The Evidence Pack](https://browsergate.eu/the-evidence-pack/)
- [BrowserGate — How It Works](https://browsergate.eu/how-it-works/)
- [Fairlinked](https://fairlinked.eu)
- [Community WhatsApp](https://chat.whatsapp.com/GEnUBww8I4yGygxeUU9coy)

## License

Do whatever you want with this.

</details>

<details>
<summary><b>Espanol</b></summary>

## Contexto

En febrero de 2026, la investigacion de [Fairlinked](https://fairlinked.eu) revelo que LinkedIn despliega un bundle JavaScript de ~2.7 MB que:

- Contiene 6,222 IDs de extensiones de Chrome hardcodeados
- Ejecuta ~6,222 llamadas `fetch()` simultaneas a URLs `chrome-extension://` para detectar extensiones instaladas
- Escanea el DOM en busca de referencias a extensiones
- Recopila 48 caracteristicas de fingerprinting del navegador (WebRTC, canvas, WebGL, fuentes, bateria, etc.)
- Envia todo a los endpoints `li/track`, `/platform-telemetry/li/apfcDf` y `/apfc/collect`
- Encripta los payloads con RSA para evitar inspeccion de red
- **No solicita consentimiento del usuario ni lo menciona en su politica de privacidad**

Existe un affidavit jurado de Milinda Lakkam (Senior Manager of Software Engineering en LinkedIn) admitiendo la existencia de estos "mecanismos de deteccion de extensiones".

## Contenido

### 1. `blocker-extension/` — Bloqueador pasivo (Extension de Chrome)

Bloquea el escaneo antes de que ocurra.

**Que hace:**
- Intercepta y bloquea las llamadas `fetch()` a `chrome-extension://`
- Bloquea los 3 endpoints de telemetria de LinkedIn via declarativeNetRequest
- Neutraliza el escaneo pasivo del DOM (TreeWalker override)
- Bloquea el iframe oculto de HUMAN Security/PerimeterX (`li.protechts.net`)
- Bloquea el script de fingerprinting de `merchantpool1.linkedin.com`

**Instalacion:**
1. Abre Chrome y navega a `chrome://extensions/`
2. Activa **Modo desarrollador** (esquina superior derecha)
3. Click en **Cargar extension sin empaquetar**
4. Selecciona la carpeta `blocker-extension/`
5. Listo. El icono aparecera en tu barra de extensiones

**Verificacion:**
- Abre LinkedIn con DevTools (F12) > Network
- No deberias ver requests a `li/track` ni a `chrome-extension://`

### 2. `poisoner.py` — Contaminador de datos

Envia datos falsos de extensiones a los endpoints de telemetria de LinkedIn para degradar la utilidad de su base de datos de fingerprinting.

**Requisitos:**
```bash
pip install requests
```

**Uso basico:**
```bash
python poisoner.py --cookie "TU_COOKIE_li_at" --rounds 50 --verbose
```

**Obtener tu cookie `li_at`:**
1. Abre LinkedIn en tu navegador
2. F12 > Application > Cookies > `www.linkedin.com`
3. Copia el valor de `li_at`

**Parametros:**

| Parametro     | Default | Descripcion                                      |
|---------------|---------|--------------------------------------------------|
| `--cookie`    | —       | **(requerido)** Cookie de sesion `li_at`          |
| `--rounds`    | 50      | Numero de rondas de envio                         |
| `--batch-size`| 30      | Extensiones falsas por ronda                      |
| `--delay`     | 3.0     | Delay base entre rondas en segundos (+/- 50% random) |
| `--verbose`   | off     | Muestra detalles de cada request                  |

**Que envia:**
- IDs de extensiones aleatorios en formato valido de Chrome Web Store (32 chars lowercase)
- Payloads que imitan `AedEvent` y `SpectroscopyEvent`
- Fingerprints de navegador aleatorios pero realistas
- User-Agents rotativos
- Delays organicos entre requests

### 3. `flooder-extension/` — Flooder activo (Extension de Chrome)

Todo lo que hace el bloqueador, mas inunda la telemetria de LinkedIn con datos falsos en cada intento de escaneo.

### 4. `configurable-flooder/` — Flooder configurable (Extension de Chrome)

Igual que el flooder pero con UI popup para cargar payloads personalizados desde un archivo `.txt`.

## Advertencias

### Terminos de servicio

El uso del poisoner o los flooders **puede infringir los Terminos de Servicio de LinkedIn**. Especificamente:

- Prohibicion de enviar informacion falsa o enganiosa
- Prohibicion de uso automatizado no autorizado de la plataforma
- Prohibicion de interferir con el funcionamiento del servicio

LinkedIn puede suspender o eliminar permanentemente tu cuenta si detecta este tipo de actividad.

### Consideraciones legales

- **LinkedIn esta recopilando datos sin consentimiento**, lo cual es una potencial violacion del GDPR en la UE y de normativas de privacidad en otras jurisdicciones
- La legalidad de responder con data poisoning depende de tu jurisdiccion local
- Este kit se proporciona con fines educativos y de investigacion en seguridad
- **Tu eres responsable de como uses estas herramientas**

### Recomendaciones

- **Usa primero el bloqueador** — es 100% defensivo y sin riesgo
- Si decides usar el poisoner, hazlo desde una cuenta que no te importe perder
- Considera reportar el comportamiento de LinkedIn a tu autoridad de proteccion de datos
- Apoya la campania de [Fairlinked](https://fairlinked.eu) que esta persiguiendo esto por la via legal

## Alternativas sin riesgo

1. **Usa Firefox** — no permite `fetch()` a `chrome-extension://` por diseno
2. **Perfil separado** — usa un perfil de Chrome sin extensiones solo para LinkedIn
3. **uBlock Origin** — agrega estas reglas personalizadas:
   ```
   ||www.linkedin.com/li/track$xhr
   ||www.linkedin.com/platform-telemetry/*$xhr
   ||www.linkedin.com/apfc/collect$xhr
   ||li.protechts.net^
   ||merchantpool1.linkedin.com^
   ```

## Referencias

- [BrowserGate — The Evidence Pack](https://browsergate.eu/the-evidence-pack/)
- [BrowserGate — How It Works](https://browsergate.eu/how-it-works/)
- [Fairlinked](https://fairlinked.eu)
- [WhatsApp de la comunidad](https://chat.whatsapp.com/GEnUBww8I4yGygxeUU9coy)

## Licencia

Haz lo que quieras con esto.

</details>
