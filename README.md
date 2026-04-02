# LinkedIn Extension Scan Defense Kit

Herramientas de defensa contra el escaneo encubierto de extensiones de navegador por parte de LinkedIn, documentado por el proyecto [BrowserGate](https://browsergate.eu/the-evidence-pack/).

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

## Advertencias

### Terminos de servicio

El uso del poisoner **puede infringir los Terminos de Servicio de LinkedIn**. Especificamente:

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

Si no quieres correr ningun riesgo:

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
