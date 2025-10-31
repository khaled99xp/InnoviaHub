FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS base
WORKDIR /app
EXPOSE 8080
ENV ASPNETCORE_URLS=http://0.0.0.0:8080

FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
ARG BUILD_CONFIGURATION=Release
WORKDIR /src

# Restore dependencies first (better caching)
COPY ["backend/backend.csproj", "backend/"]
RUN dotnet restore "backend/backend.csproj" \
    --verbosity minimal \
    --no-cache

# Copy source code
COPY backend/ backend/
WORKDIR "/src/backend"

# Build with optimizations
RUN dotnet build "backend.csproj" \
    -c $BUILD_CONFIGURATION \
    -o /app/build \
    /p:OpenApiGenerateDocuments=false \
    /p:UseAppHost=false \
    --no-restore

FROM build AS publish
ARG BUILD_CONFIGURATION=Release
RUN dotnet publish "backend.csproj" \
    -c $BUILD_CONFIGURATION \
    -o /app/publish \
    /p:OpenApiGenerateDocuments=false \
    /p:UseAppHost=false \
    --no-restore \
    --no-build

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "backend.dll"]

