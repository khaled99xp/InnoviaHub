# InnoviaHub - Avancerat Bokningssystem

## Om projektet

InnoviaHub är ett avancerat bokningssystem för ett coworkingcenter med AI-integration. Systemet möjliggör för användare att boka olika typer av resurser (skrivbord, mötesrum, VR-utrustning och AI-servrar) med realtidsuppdatering och intelligenta AI-drivna rekommendationer.

### Deployad applikation

🌐 **Applikation**: [https://shark-app-wjvir.ondigitalocean.app/](https://shark-app-wjvir.ondigitalocean.app/)

Applikationen är deployad på DigitalOcean App Platform.

# Teknisk information

## Ramverk och bibliotek

- React
- Tailwind CSS
- ASP.NET Core Web API
- MySQL
- SignalR för realtidsuppdatering
- OpenAI GPT-3.5-turbo för AI-funktionalitet
- JWT-autentisering

## Nya funktioner (AI-integration)

- **AI Chat**: Intelligenta rekommendationer för bokningar med kontextuell förståelse
- **Smart Booking Helper**: AI-assistent som hjälper användare att välja rätt resurs
- **AI Insights**: Avancerad analys av bokningsmönster för administratörer
- **Intelligent Resource Recommendations**: AI-förslag baserat på användarens behov
- **Context-Aware AI**: AI som förstår plattformens syfte och filtrerar irrelevanta frågor
- **Dynamic Prompt Management**: Konfigurerbara AI-prompts utan omstart av applikationen

## Annat

- Frontend körs på [http://localhost:5173](http://localhost:5173)
- Backend körs på [http://localhost:5296](http://localhost:5296)
- Använder RESTful API
- Använder JWT-token för autentisering
- SignalR för realtidsuppdatering av bokningar
- OpenAI API för AI-funktionalitet

# Appbyggande

## Nödvändiga installationer

- .NET 8 eller 9
- Node.js & npm
- MySQL
- OpenAI API-nyckel (för AI-funktionalitet)

## Databas

- Skapa en SQL connection på localhost:3306.
- Gå in på "appsettings.json" i backend-mappen.
- I strängen "DefaultConnection", ändra "User" till din connections användarnamn och "Password" till din connections lösenord.
- Sätt en secretkey till minst 32 tecken.

## Miljövariabler och konfiguration

### Databas

Applikationen använder MySQL som databas. Konfigurera anslutningssträngen via miljövariabel:

```bash
ConnectionStrings__DefaultConnection="Server=localhost;Port=3306;Database=innoviahub;User=din_användare;Password=ditt_lösenord;"
```

**Alternativt** kan du konfigurera i `appsettings.json` för lokal utveckling (ej rekommenderat för produktion).

### JWT Autentisering

Konfigurera JWT-inställningar via miljövariabler:

```bash
Jwt__SecretKey="din_hemliga_nyckel_minst_32_tecken_lång"
Jwt__Issuer="https://shark-app-wjvir.ondigitalocean.app"
Jwt__Audience="https://shark-app-wjvir.ondigitalocean.app"
Jwt__ExpirationMinutes=60
```

### AI-konfiguration (OpenAI)

AI-funktionalitet är valfri - systemet fungerar även utan OpenAI-nyckel. För att aktivera AI-funktioner:

```bash
OpenAI__ApiKey="din-openai-api-nyckel"
```

**AI Prompts**: Konfigurera AI-beteende genom att redigera `backend/Config/AIPrompts.json`
**Smart Filtering**: AI filtrerar automatiskt irrelevanta frågor och fokuserar på bokningsrelaterade ämnen

### SignalR (Valfritt)

För produktion kan du konfigurera en extern SignalR-tjänst om det behövs för skalbarhet:

```bash
Azure__SignalR__ConnectionString="din-signalr-connection-string"
```

Om inte konfigurerat används in-process SignalR (fungerar perfekt för lokal utveckling och mindre produktioner).

### CORS-inställningar

```bash
Cors__AllowedOrigins="https://shark-app-wjvir.ondigitalocean.app,https://localhost:5173"
```

**OBS**: Se filen `ENV_VARIABLES.md` för en komplett guide över alla miljövariabler och hur de konfigureras.

## Starta applikationen

```
cd backend
dotnet restore
dotnet ef database update
dotnet run
```

```
cd frontend
npm install
npm run dev
```

## IoT – Lokal körning och seed

Följ stegen nedan för att starta Innovia Hub IoT‑tjänster lokalt och (valfritt) seeda 10 standardenheter i DeviceRegistry.

1. DeviceRegistry.Api (med valfri seed av 10 enheter)

PowerShell (Windows):

```
# Gå till tjänstens katalog
cd ..\innovia-iot\src\DeviceRegistry.Api

# (Valfritt) aktivera seed – skapar tenant "innovia" och 10 enheter (dev-101..dev-110)
$env:DEVICE_REGISTRY_SEED = "true"
$env:SEED_TENANT_SLUG = "innovia"
$env:SEED_TENANT_NAME = "Innovia"

# Starta tjänsten
dotnet run
```

Verifiera via Swagger: `http://localhost:5101/swagger`

- Hämta tenant: `GET /api/tenants/by-slug/innovia`
- Lista enheter: `GET /api/tenants/{tenantId}/devices`

2. MQTT‑broker (Mosquitto)

- Se projektets IoT‑README för docker‑compose/startinstruktioner: `../innovia-iot/README.md`
- Kör lokalt på `localhost:1883`.

3. Edge.Simulator (läser enheter dynamiskt från DeviceRegistry)

PowerShell (Windows):

```
cd ..\innovia-iot\src\Edge.Simulator
dotnet run
```

Simulatorn:

- Hämtar tenant `innovia` och enheter från DeviceRegistry.
- Publicerar mätvärden för enheter med `Status=active` ungefär var 10:e sekund via MQTT.

4. Realtime.Hub, Ingest.Gateway, Portal.Adapter

- Starta respektive tjänst enligt `../innovia-iot/README.md` (SignalR‑hub, ingest och adapter‑API).

5. Frontend (visning i portalen)

- IoT Dashboard: `http://localhost:5173/admin/iot-dashboard`
- Enheter från DeviceRegistry listas, och senaste mätvärden visas i realtid.

## Testguide och inloggningsuppgifter

### Hur man testar applikationen

För att testa applikationen kan du använda följande steg:

1. **Öppna den deployade applikationen**: Navigera till [https://shark-app-wjvir.ondigitalocean.app/](https://shark-app-wjvir.ondigitalocean.app/)

2. **Logga in med testkonton**:

   - **Admin-konto** (fullständig åtkomst till alla funktioner):

     - E-post: `admin@innoviahub.com`
     - Lösenord: `Admin123!`

   - **Medlemskonto** (standard användare):
     - E-post: `member@innoviahub.com`
     - Lösenord: `Member123!`

3. **Alternativt**: Skapa ett nytt konto genom registreringsformuläret

### Testscenarier

#### För medlemmar (Members):

- ✅ Logga in och utforska tillgängliga resurser
- ✅ Skapa en ny bokning (skrivbord, mötesrum, VR-set eller AI-server)
- ✅ Visa dina egna bokningar på "Mina Bokningar"-sidan
- ✅ Avbryt en aktiv bokning
- ✅ Använd AI Chat för att få rekommendationer
- ✅ Testa betalningsflödet

#### För administratörer (Admins):

- ✅ Logga in på admin-panelen: `/admin`
- ✅ Hantera resurser (skapa, uppdatera, ta bort)
- ✅ Se alla bokningar i systemet
- ✅ Använd AI Insights för att analysera bokningsmönster
- ✅ Visa användarstatistik och rapporter
- ✅ Hantera IoT-enheter (om IoT-funktionalitet är aktiverad)

### Funktioner att testa

**Realtidskommunikation (SignalR)**:

- Öppna applikationen i två olika webbläsare/flikar
- Logga in med olika konton
- Skapa eller avbryt en bokning i en flik
- Observera att uppdateringen syns omedelbart i den andra fliken utan siduppdatering

**Bokningsflöde**:

- Navigera till bokningssidan
- Välj en resurs (t.ex. mötesrum)
- Välj datum och tidslucka (FM: 08:00-12:00 eller EF: 12:00-16:00)
- Bekräfta bokningen
- Verifiera att bokningen visas i "Mina Bokningar"

**AI-funktionalitet**:

- Navigera till AI Chat (`/ai-chat`)
- Ställ frågor om bokningar, tillgänglighet eller resurser
- Be om rekommendationer baserat på dina behov
- Testa smarta förslag när du skapar bokningar

## AI-funktioner

- **AI Chat**: [http://localhost:5173/ai-chat](http://localhost:5173/ai-chat) - Chat med AI för bokningshjälp
- **AI Insights**: [http://localhost:5173/admin/ai-insights](http://localhost:5173/admin/ai-insights) - AI-analys för administratörer
- **Smart Booking**: AI-rekommendationer när du skapar bokningar
- **Context-Aware Responses**: AI förstår plattformens syfte och svarar endast på bokningsrelaterade frågor
- **Dynamic Prompt Configuration**: Anpassa AI-beteende genom konfigurationsfiler

# Endpoints

<details>

<summary> Authentication endpoints </summary>

**GET**
**/api/auth/health**

Returnerar statuskod 400 om API:et fungerar.

**POST**
**/api/auth/register** <br />
Body: <br />
string Email, <br />
string FirstName, <br />
string LastName, <br />
string Password, <br />
string ConfirmPassword

Skapar en ny användare med rollen "Member".

**POST**
**/api/auth/login** <br />
Body: <br />
string Email, <br />
string Password

Loggar in användare och returnerar JWT-token.

**POST**
**api/auth/logout**

Loggar ut användare.

**GET**
**api/auth/profile** <br />
Autentisering: Member

Returnerar hela objektet av användaren som loggar in.

**PUT**
**/api/auth/profile** <br />
Autentisering: Member <br />
Body: <br />
string FirstName <br />
string LastName

Ändrar FirstName och LastName av användaren som loggar in.

**POST**
**/api/auth/refresh-token** <br />
Autentisering: Member <br />
Body: <br />
string Token

Uppdaterar och returnerar token.

</details>

<details>

<summary> Booking endpoints </summary>

**GET**
**/api/bookings/** <br />
Autentisering: Admin, Member <br />

Returnerar alla bokningar.

**GET**
**/api/bookings/{bookingId}** <br />
Autentisering: Admin, Member

Returnerar bokning som motsvarar id.

**GET**
**/api/bookings/myBookings** <br />
Autentisering: Admin, Member <br />
Body: <br />
bool includeExpiredBookings (default är false)

Returnerar alla aktiva bokningar som tillhör användaren. Måste specificera om man vill inkludera inaktiva bokningar.

**GET**
**/api/bookings/getByResource/{resourceId}** <br />
Autentisering: Admin, Member <br />
Body: <br />
bool includeExpiredBookings (default är false)

Returnerar alla aktiva bokningar som tillhör en resurs. Måste specificera om man vill inkludera inaktiva bokningar.

**POST**
**/api/bookings** <br />
Autentisering: Admin, Member <br />
Body: <br />
int ResourceId <br />
DateTime BookingTime <br />
string Timeslot (måste vara "FM" eller "EF")

Skapar en bokning. Tiden på "BookingTime" ersätts av "8:00" eller "12:00" beroende på timeslot.

**PUT**
**/api/bookings** <br />
Autentisering: Admin <br />
Body: <br />
int BookingId, <br />
bool IsActive, <br />
DateTime BookingDate, <br />
DateTime EndDate, <br />
string UserId, <br />
int ResourceId

Uppdaterar bokning.

**POST**
**/api/bookings/cancel/{bookingId}** <br />
Autentisering: Admin, Member <br />

Tar bort bokning som motsvarar "bookingId". <br />
Members kan bara ta bort sina egna bokningar och Admins kan ta bort vilken bokning som helst. <br />
Bokningar som har gått ut kan inte tas bort.

**POST**
**/api/bookings/delete/{bookingId}** <br />
Autentisering: Admin

Tar bort bokning.

</details>

<details>

<summary> Resource endpoints </summary>

**GET**
**/api/bookings/resources** <br />
Autentisering: Admin, Member

Returnerar alla resurser.

**GET**
**api/resources/{resourceId}** <br />
Autentisering: Admin, Member

Returnerar resurs som motsvarar id.

**POST**
**api/resources** <br />
Autentisering: Admin <br />
Body: <br />
int ResourceTypeId (1 = DropInDesk, 2 = MeetingRoom, 3 = VRset, 4 = AIserver), <br />
string Name

Skapar en ny resurs.

**PUT**
**api/resources/{resourceId}** <br />
Autentisering: Admin <br />
Body: <br />
int ResourceTypeId (1 = DropInDesk, 2 = MeetingRoom, 3 = VRset, 4 = AIserver), <br />
string Name, <br />
bool IsBooked

Uppdaterar resursen som motsvarar id.

**DELETE**
**api/resources/{resourceId}** <br />
Autentisering: Admin

Tar bort resurs.

</details>

<details>

<summary> AI endpoints </summary>

**POST**
**/api/ai/chat** <br />
Autentisering: Member <br />
Body: <br />
string Message, <br />
string SessionId (valfritt)

Skickar meddelande till AI-chatten och får intelligenta svar om bokningar. AI filtrerar automatiskt irrelevanta frågor och fokuserar på bokningsrelaterade ämnen.

**GET**
**/api/ai/insights** <br />
Autentisering: Admin

Returnerar AI-genererade insikter om bokningsmönster och rekommendationer.

**POST**
**/api/ai/recommendations** <br />
Autentisering: Member <br />
Body: <br />
string UserPreferences

Får AI-rekommendationer för resurser baserat på användarens preferenser.

**GET**
**/api/ai/chat-history** <br />
Autentisering: Member

Returnerar användarens AI-chatthistorik.

</details>

<details>

<summary> Payment endpoints </summary>

**POST**
**/api/payment/process** <br />
Autentisering: Member <br />
Body: <br />
int BookingId, <br />
decimal Amount, <br />
string PaymentMethod

Processar betalning för en bokning.

**GET**
**/api/payment/history** <br />
Autentisering: Member

Returnerar användarens betalningshistorik.

</details>

# Avancerade funktioner

## Realtidsuppdatering

- **SignalR Integration**: Automatiska uppdateringar när bokningar skapas, ändras eller avbryts
- **Live Status**: Se bokningsstatus i realtid utan att behöva uppdatera sidan
- **Push Notifications**: Få notifieringar om bokningsändringar

## AI-drivna funktioner

- **Intelligent Booking Assistant**: AI som hjälper användare att välja rätt resurs
- **Smart Recommendations**: Personliga förslag baserat på användarens historik
- **Predictive Analytics**: AI-analys av bokningsmönster för bättre planering
- **Natural Language Processing**: Chat med AI på naturligt språk
- **Context-Aware Filtering**: AI förstår plattformens syfte och filtrerar irrelevanta frågor
- **Dynamic Prompt Management**: Konfigurerbara AI-prompts för anpassade beteenden
- **Smart Response System**: AI svarar endast på bokningsrelaterade frågor med relevanta förslag

## Administrativa verktyg

- **AI Insights Dashboard**: Avancerad analys av systemets prestanda
- **User Analytics**: Djupgående användarstatistik
- **Resource Optimization**: AI-förslag för resursförbättringar
- **Automated Reports**: Automatiska rapporter med AI-insikter

## AI Prompt Management

### Konfigurera AI-beteende

AI-systemet använder konfigurerbara prompts för att säkerställa relevanta svar. Redigera `backend/Config/AIPrompts.json` för att anpassa AI-beteendet:

```json
{
  "SystemPrompt": "Du är en AI-assistent för InnoviaHub...",
  "NonPlatformResponse": "Jag beklagar, jag är en assistent specialiserad...",
  "PlatformKeywords": ["boka", "resurs", "mötesrum", "skrivbord"],
  "NonPlatformKeywords": ["hungrig", "mat", "väder", "sport"]
}
```

### Funktioner

- **Smart Filtering**: AI filtrerar automatiskt irrelevanta frågor
- **Context Awareness**: Förstår plattformens syfte och fokuserar på bokningar
- **Dynamic Configuration**: Ändra AI-beteende utan omstart av applikationen
- **Keyword Management**: Konfigurera vilka ord som ska filtreras eller tillåtas

## Driftsättning

Applikationen är deployad på **DigitalOcean App Platform**:

🌐 **Länk**: [https://shark-app-wjvir.ondigitalocean.app/](https://shark-app-wjvir.ondigitalocean.app/)

### Deployment-miljö

- **Platform**: DigitalOcean App Platform
- **Backend**: ASP.NET Core API
- **Frontend**: React (Vite)
- **Databas**: MySQL (produktion) eller lokal MySQL (utveckling)
- **SignalR**: In-process SignalR (eller konfigurerad SignalR-tjänst)

### Miljökonfiguration för produktion

Alla känsliga värden konfigureras via DigitalOcean App Platform Environment Variables:

- `ConnectionStrings__DefaultConnection`
- `Jwt__SecretKey`
- `Jwt__Issuer`
- `Jwt__Audience`
- `OpenAI__ApiKey`
- `Cors__AllowedOrigins`

**Konfigurera i DigitalOcean:**

1. Öppna DigitalOcean App Platform
2. Navigera till din app
3. Gå till **Settings** → **App-Level Environment Variables**
4. Lägg till varje variabel med dubbel underscore (`__`) för nested config

### Lokal utveckling

För lokal utveckling kan du antingen:

1. Använda miljövariabler i systemet
2. Skapa `appsettings.Development.json` (kommer inte att committas till Git)
3. Använda User Secrets: `dotnet user-secrets set "ConnectionStrings:DefaultConnection" "din-connection-string"`

## Utvecklade funktioner

Följande funktioner har utvecklats och integrerats i systemet:

### Kärnfunktionalitet (från grupparbetet)

- ✅ **Användarautentisering**: Registrering, inloggning, JWT-baserad autentisering
- ✅ **Bokningssystem**: Skapa, visa, uppdatera och avbryta bokningar
- ✅ **Resurshantering**: Hantera skrivbord, mötesrum, VR-utrustning och AI-servrar
- ✅ **Rollbaserad åtkomst**: Separata behörigheter för medlemmar och administratörer
- ✅ **Admin Dashboard**: Omfattande admin-panel för systemhantering

### Vidareutvecklade funktioner

#### Realtidskommunikation (SignalR)

- ✅ **Realtidsuppdateringar**: Automatiska uppdateringar när bokningar skapas, ändras eller avbryts
- ✅ **Live Status**: Se bokningsstatus i realtid utan siduppdatering
- ✅ **Push Notifications**: Få notifieringar om bokningsändringar
- ✅ **SignalR Integration**: Realtidskommunikation med in-process SignalR eller extern SignalR-tjänst

#### AI-implementering

- ✅ **AI Chat**: Intelligenta konversationer om bokningar med kontextuell förståelse
- ✅ **Smart Booking Assistant**: AI-assistent som hjälper användare att välja rätt resurs
- ✅ **AI Insights Dashboard**: Avancerad analys av bokningsmönster för administratörer
- ✅ **Intelligent Resource Recommendations**: AI-förslag baserat på användarens historik och preferenser
- ✅ **Context-Aware AI**: AI som förstår plattformens syfte och filtrerar irrelevanta frågor
- ✅ **Dynamic Prompt Management**: Konfigurerbara AI-prompts utan omstart av applikationen
- ✅ **Smart Response System**: AI svarar endast på bokningsrelaterade frågor med relevanta förslag
- ✅ **Predictive Analytics**: AI-analys av bokningsmönster för bättre planering

#### Ytterligare förbättringar

- ✅ **Betalningssystem**: Integrering för betalningshantering
- ✅ **IoT Dashboard**: Integration med IoT-enheter för realtidsövervakning
- ✅ **Avancerad felhantering**: Robust error handling middleware
- ✅ **Request Logging**: Logging middleware för debugging och monitoring
- ✅ **API Dokumentation**: Scalar API-dokumentation integrerad

## Säkerhet och prestanda

- **JWT Authentication**: Säker autentisering med token-baserad säkerhet
- **Role-based Access Control**: Olika behörigheter för användare och administratörer
- **Database Optimization**: Optimerad databasstruktur för snabba svar
- **Error Handling**: Robust felhantering med detaljerade felmeddelanden
- **AI Security**: Säker AI-integration med konfigurerbara säkerhetsinställningar
- **Environment Variables**: Alla känsliga värden hanteras via miljövariabler
