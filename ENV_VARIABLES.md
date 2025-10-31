# Miljövariabler - Konfigurationsguide

Detta dokument beskriver alla miljövariabler som krävs för att köra InnoviaHub.

## Snabbstart

För lokal utveckling kan du antingen:
1. Skapa en `appsettings.Development.json` i `backend/`-mappen
2. Använda systemmiljövariabler
3. Använda .NET User Secrets

## Miljövariabler

### Databas

```bash
ConnectionStrings__DefaultConnection=Server=localhost;Port=3306;Database=innoviahub;User=din_användare;Password=ditt_lösenord;
```

**Beskrivning:** MySQL-anslutningssträng för databasen.  
**Krävs:** Ja  
**Exempel (Development):** `Server=localhost;Port=3306;Database=innoviahub_dev;User=root;Password=password;`

---

### JWT Autentisering

```bash
Jwt__SecretKey=din_hemliga_nyckel_minst_32_tecken_lång
Jwt__Issuer=https://innoviahub.azurewebsites.net
Jwt__Audience=https://innoviahub.azurewebsites.net
Jwt__ExpirationMinutes=60
```

**Beskrivning:**
- `SecretKey`: Hemlig nyckel för att signera JWT-tokens (minst 32 tecken)
- `Issuer`: URI som utfärdar tokens
- `Audience`: URI som accepterar tokens
- `ExpirationMinutes`: Hur länge tokens är giltiga

**Krävs:** Ja  
**Exempel:** `Jwt__SecretKey=superhemlignyckel12345678901234567890`

---

### OpenAI API (Valfritt)

```bash
OpenAI__ApiKey=sk-din-openai-api-nyckel-här
```

**Beskrivning:** OpenAI API-nyckel för AI-funktionalitet.  
**Krävs:** Nej (AI-funktioner fungerar även utan, men med begränsad funktionalitet)  
**Var att hitta:** [OpenAI Platform](https://platform.openai.com/api-keys)

---

### Azure SignalR Service (Valfritt)

```bash
Azure__SignalR__ConnectionString=Endpoint=https://din-signalr.service.signalr.net;AccessKey=din-access-key;
```

**Beskrivning:** Connection string för Azure SignalR Service. Om inte konfigurerad används in-process SignalR.  
**Krävs:** Nej (fungerar med in-process SignalR för lokal utveckling)  
**När behövs:** För produktion med flera serverinstanser

---

### CORS

```bash
Cors__AllowedOrigins=https://innoviahub-frontend.azurewebsites.net,https://localhost:5173
```

**Beskrivning:** Kommaseparerade lista över tillåtna ursprung för CORS.  
**Krävs:** Ja  
**Format:** Kommaseparerade URLs utan mellanslag

---

### ASP.NET Core Miljö

```bash
ASPNETCORE_ENVIRONMENT=Development
```

**Beskrivning:** Miljö för ASP.NET Core (`Development`, `Staging`, `Production`).  
**Krävs:** Nej (default är `Production`)  
**Värden:** `Development`, `Staging`, `Production`

---

## Konfiguration i Azure App Service

För produktion konfigureras miljövariabler via Azure Portal:

1. Öppna Azure Portal
2. Navigera till din App Service
3. Gå till **Configuration** → **Application settings**
4. Lägg till varje variabel med dubbel underscore (`__`) för nested config:
   - `ConnectionStrings__DefaultConnection`
   - `Jwt__SecretKey`
   - etc.

**OBS:** Använd alltid dubbel underscore (`__`) för nested configuration i Azure.

---

## Lokal utveckling

### Alternativ 1: appsettings.Development.json

Skapa filen `backend/appsettings.Development.json`:

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=localhost;Port=3306;Database=innoviahub_dev;User=root;Password=password;"
  },
  "Jwt": {
    "SecretKey": "din-development-secret-key-minst-32-tecken",
    "Issuer": "http://localhost:5296",
    "Audience": "http://localhost:5296",
    "ExpirationMinutes": 60
  },
  "OpenAI": {
    "ApiKey": "din-openai-api-nyckel"
  },
  "Cors": {
    "AllowedOrigins": "http://localhost:5173,http://localhost:3000"
  }
}
```

**OBS:** Denna fil är i `.gitignore` och committas inte till Git.

### Alternativ 2: User Secrets

```bash
cd backend
dotnet user-secrets set "ConnectionStrings:DefaultConnection" "din-connection-string"
dotnet user-secrets set "Jwt:SecretKey" "din-secret-key"
dotnet user-secrets set "OpenAI:ApiKey" "din-api-nyckel"
```

### Alternativ 3: Systemmiljövariabler

**Windows (PowerShell):**
```powershell
$env:ConnectionStrings__DefaultConnection = "Server=localhost;..."
$env:Jwt__SecretKey = "din-nyckel"
```

**Linux/Mac:**
```bash
export ConnectionStrings__DefaultConnection="Server=localhost;..."
export Jwt__SecretKey="din-nyckel"
```

---

## Säkerhet

⚠️ **VIKTIGT:**
- Lägg **ALDRIG** API-nycklar eller lösenord i `appsettings.json` som committas till Git
- Använd alltid miljövariabler eller User Secrets för känslig data
- I produktion använd alltid Azure Key Vault eller Application Settings
- Rotera API-nycklar regelbundet

---

## Validering

Systemet validerar att följande variabler är konfigurerade vid start:
- `ConnectionStrings__DefaultConnection`
- `Jwt__SecretKey`

Om någon saknas kommer applikationen inte att starta och visar ett tydligt felmeddelande.

