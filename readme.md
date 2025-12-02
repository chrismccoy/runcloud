# RunCloud WordPress Automator 🚀

A CLI tool designed to automate the provisioning of WordPress sites on RunCloud servers via API v3. 

> [!WARNING]
> **Account Requirement:**
> Access to the RunCloud API is restricted to **Business** and **Enterprise** accounts. This tool will not work with Basic or Pro accounts due to API limitations.

## Features

⚡ **Atomic Provisioning**
Leverages the v3 "One-Click" endpoint to create the web container, configure Nginx/Apache, and install WordPress in a single HTTP request.

🔐 **Secure Credentials**
- **Passwords:** Auto generates cryptographically strong passwords if not provided.
- **Database:** Uses strict alphanumeric generation for DB passwords to prevent API validation errors.
- **Storage:** Sensitive keys are managed via `.env` and never hardcoded.

🎛 **Control**
- Override any default setting via CLI flags, stack type, PHP version, system owner ID, admin email, and more.

🔓 **Unrestricted PHP Mode**
- Optionally patch the server configuration to **unlock dangerous PHP functions** (like `exec`, `shell_exec`, `passthru`) automatically during provisioning.

🚀 **RunCloud Hub Integration**
- Automatically installs and configures the **RunCloud Hub** plugin with options for **Native Nginx FastCGI** or **Redis Object Caching**.

🔒 **Automated SSL**
- Optionally provisions **Let's Encrypt SSL** certificates automatically (requires DNS propagation).

🐘 **Modern PHP Support**
- Full support for PHP versions **7.4** through **8.4**.

## Usage

### 🚀 Quick Start
Provisions a site using safe defaults (Nginx, PHP 8.2, Hub Installed, Secure PHP).
```bash
node cli.js --domain=mysite.com --app=mysite-app
```

### 🔓 Unrestricted Mode
Creates a site, disables the Hub, and **unlocks all PHP functions** (enabling `exec`, `shell_exec`), and sets PHP to 8.4
```bash
node cli.js -d domain.com -a dev-app --no-hub --unrestricted --php=8.4
```

### ⚡ Performance Mode
Creates a site using **Redis Page Cache** and **Redis Object Cache**.
```bash
node cli.js -d domain.com -a my-app --hub-type=redis --redis-obj
```

### 🏢 Full Configuration
Creates a site using **Apache Hybrid**, **SSL enabled**, assigned to a specific **System User ID**, with a custom admin email.
```bash
node cli.js \
  --domain=domain.com \
  --app=domain-app \
  --stack=apache \
  --owner=1005 \
  --email=admin@domain.com \
  --ssl
```

## Configuration Flags

| Flag | Alias | Description | Default |
|------|-------|-------------|---------|
| `--domain` | `-d` | **Required.** The domain name for the site. | N/A |
| `--app` | `-a` | **Required.** The internal RunCloud App Name. | N/A |
| `--user` | `-u` | WordPress Admin Username. | `admin` (or `.env`) |
| `--password` | `-P` | WordPress Admin Password. | Random (or `.env`) |
| `--email` | `-e` | WordPress Admin Email. | `admin@domain` (or `.env`) |
| `--owner` | `-o` | System User ID (e.g., 1001). | `runcloud` user (or `.env`) |
| `--stack` | `-s` | Server Stack: `nginx` or `apache`. | `nginx` |
| `--php` | `-p` | PHP Version (`7.4`, `8.0`, `8.1`, `8.2, `8.3`, `8.4`). | `8.2` |
| `--hub` | N/A | Install RunCloud Hub? (`--no-hub` to disable). | `true` |
| `--hub-type` | N/A | Cache Type: `native` or `redis`. | `native` |
| `--redis-obj`| N/A | Enable Redis Object Cache (boolean). | `false` |
| `--ssl` | N/A | Provision Let's Encrypt SSL (boolean). | `false` |
| `--unrestricted` | N/A | Remove PHP function restrictions (boolean). | `false` |

## Environment Variables

You can set global defaults in your `.env` file to avoid typing flags repeatedly.

```text
# Credentials
RC_API_KEY=...          # Required
RC_SERVER_ID=...        # Required

# Site Defaults
RC_DEFAULT_USER=1       # System Owner ID
RC_ADMIN_EMAIL=...      # Global Admin Email
RC_ADMIN_USER=...       # Global Admin Username
RC_ADMIN_PASSWORD=...   # Global Admin Password

# Feature Flags
RC_INSTALL_HUB=true     # Install Hub by default?
RC_INSTALL_SSL=false    # Install SSL by default?
RC_UNRESTRICTED_PHP=false # Remove PHP restrictions by default

# Hub Settings
RC_HUB_TYPE=native      # native | redis
RC_HUB_REDIS_OBJ=false  # true | false
```
