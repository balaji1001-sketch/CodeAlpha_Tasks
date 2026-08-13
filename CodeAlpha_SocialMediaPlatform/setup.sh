#!/usr/bin/env bash
#
# LinkUp — one-shot macOS setup
#
#   bash setup.sh
#
# Checks Node, installs dependencies, creates .env with a generated JWT secret,
# verifies MongoDB is installed and running, and offers to seed demo data.
# Safe to re-run: it never overwrites an existing .env.

set -uo pipefail

BOLD='\033[1m'; DIM='\033[2m'; RED='\033[31m'; GREEN='\033[32m'
YELLOW='\033[33m'; BLUE='\033[34m'; RESET='\033[0m'

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND="$ROOT/backend"
MONGO_FORMULA="mongodb-community@7.0"
DB_NAME="socialmedia"
MONGO_URI="mongodb://127.0.0.1:27017/$DB_NAME"

step()  { printf "\n${BOLD}${BLUE}==>${RESET} ${BOLD}%s${RESET}\n" "$1"; }
ok()    { printf "    ${GREEN}✓${RESET} %s\n" "$1"; }
warn()  { printf "    ${YELLOW}!${RESET} %s\n" "$1"; }
err()   { printf "    ${RED}✗${RESET} %s\n" "$1"; }
info()  { printf "    ${DIM}%s${RESET}\n" "$1"; }

fatal() { err "$1"; printf "\n${RED}${BOLD}Setup stopped.${RESET}\n\n"; exit 1; }

# ask "Question?" -> returns 0 for yes, 1 for no.
# Defaults to "no" when there is no interactive terminal (CI, piped input),
# so the script never hangs or crashes in a non-interactive context.
ask() {
  local prompt="$1" answer=""
  printf "    ${BOLD}%s [y/N]${RESET} " "$prompt"

  # Test that /dev/tty can actually be opened — it can exist as a device node
  # yet still fail when there is no controlling terminal.
  if { : </dev/tty; } 2>/dev/null; then
    read -r answer </dev/tty 2>/dev/null || answer=""
  elif [ -t 0 ]; then
    read -r answer || answer=""
  else
    answer=""
    printf "\n"
    info "No interactive terminal detected — skipping."
    return 1
  fi

  case "$answer" in
    [Yy] | [Yy][Ee][Ss]) return 0 ;;
    *) return 1 ;;
  esac
}

printf "\n${BOLD}  LinkUp — Mini Social Media Platform${RESET}\n"
printf "${DIM}  macOS setup${RESET}\n"

# ---------------------------------------------------------------------------
# 1. Node.js
# ---------------------------------------------------------------------------
step "Checking Node.js"

if ! command -v node >/dev/null 2>&1; then
  err "Node.js is not installed."
  info "Install it with:  brew install node"
  info "Or download from: https://nodejs.org (choose the LTS build)"
  fatal "Node.js 18 or newer is required."
fi

NODE_VERSION="$(node -v)"
NODE_MAJOR="$(printf '%s' "$NODE_VERSION" | sed 's/^v//' | cut -d. -f1)"

if [ "$NODE_MAJOR" -lt 18 ]; then
  err "Node $NODE_VERSION found, but 18 or newer is required."
  info "Upgrade with:  brew upgrade node"
  fatal "Node.js version too old."
fi
ok "Node $NODE_VERSION"
ok "npm $(npm -v)"

# ---------------------------------------------------------------------------
# 2. Dependencies
# ---------------------------------------------------------------------------
step "Installing backend dependencies"

cd "$BACKEND" || fatal "Cannot find the backend folder at $BACKEND"

if [ -d node_modules ] && [ -f package-lock.json ]; then
  info "node_modules already present — verifying it is up to date"
fi

if npm install --no-audit --no-fund; then
  ok "Dependencies installed"
else
  err "npm install failed."
  info "Common causes: no internet connection, or a corporate proxy."
  info "Try:  npm cache clean --force  &&  npm install"
  fatal "Could not install dependencies."
fi

# ---------------------------------------------------------------------------
# 3. Environment file
# ---------------------------------------------------------------------------
step "Configuring environment (.env)"

if [ -f "$BACKEND/.env" ]; then
  ok ".env already exists — leaving it untouched"
  if ! grep -q '^JWT_SECRET=.\{32,\}' "$BACKEND/.env"; then
    warn "JWT_SECRET looks short or missing. Generate one with:"
    info "node -e \"console.log(require('crypto').randomBytes(48).toString('hex'))\""
  fi
else
  [ -f "$BACKEND/.env.example" ] || fatal "backend/.env.example is missing."

  JWT_SECRET="$(node -e "console.log(require('crypto').randomBytes(48).toString('hex'))")"
  [ -n "$JWT_SECRET" ] || fatal "Could not generate a JWT secret."

  cp "$BACKEND/.env.example" "$BACKEND/.env"

  # BSD sed (macOS) requires an argument to -i
  sed -i '' "s|^JWT_SECRET=.*|JWT_SECRET=$JWT_SECRET|" "$BACKEND/.env"
  sed -i '' "s|^MONGO_URI=.*|MONGO_URI=$MONGO_URI|" "$BACKEND/.env"

  ok ".env created from .env.example"
  ok "JWT_SECRET generated (96 hex characters)"
  ok "MONGO_URI set to $MONGO_URI"
fi

# ---------------------------------------------------------------------------
# 4. Upload folders
# ---------------------------------------------------------------------------
step "Preparing upload folders"
mkdir -p "$BACKEND/uploads/avatars" "$BACKEND/uploads/posts"
touch "$BACKEND/uploads/avatars/.gitkeep" "$BACKEND/uploads/posts/.gitkeep"
ok "uploads/avatars and uploads/posts ready"

# ---------------------------------------------------------------------------
# 5. MongoDB
# ---------------------------------------------------------------------------
step "Checking MongoDB"

MONGO_READY=0

if ! command -v brew >/dev/null 2>&1; then
  warn "Homebrew is not installed."
  info "Install it from https://brew.sh, then re-run this script."
  info "Or install MongoDB manually: https://www.mongodb.com/try/download/community"
elif ! brew list --formula 2>/dev/null | grep -q "^mongodb-community"; then
  warn "MongoDB is not installed via Homebrew."
  printf "\n    Install it now? This runs:\n"
  info "brew tap mongodb/brew && brew install $MONGO_FORMULA"
  if ask "Install MongoDB?"; then
    brew tap mongodb/brew && brew install "$MONGO_FORMULA" && ok "MongoDB installed"
  else
    info "Skipped. Install it later, then run: brew services start $MONGO_FORMULA"
  fi
else
  ok "MongoDB is installed"
fi

# Start the service if it is installed but not running
if command -v brew >/dev/null 2>&1 && brew list --formula 2>/dev/null | grep -q "^mongodb-community"; then
  if brew services list 2>/dev/null | grep -q "mongodb-community.*started"; then
    ok "MongoDB service is already running"
  else
    info "Starting the MongoDB service…"
    if brew services start "$MONGO_FORMULA" >/dev/null 2>&1; then
      ok "MongoDB service started"
      sleep 3
    else
      warn "Could not start MongoDB automatically."
      info "Try manually: brew services start $MONGO_FORMULA"
    fi
  fi
fi

# Verify we can actually connect
if command -v mongosh >/dev/null 2>&1; then
  info "Testing the connection…"
  for attempt in 1 2 3 4 5; do
    if mongosh "$MONGO_URI" --quiet --eval 'db.runCommand({ping:1})' >/dev/null 2>&1; then
      MONGO_READY=1
      break
    fi
    sleep 2
  done

  if [ "$MONGO_READY" -eq 1 ]; then
    ok "Connected to MongoDB at 127.0.0.1:27017"
  else
    warn "MongoDB is not responding on port 27017 yet."
    info "Check its status with:  brew services list"
    info "View the log with:      tail -f \$(brew --prefix)/var/log/mongodb/mongo.log"
  fi
else
  warn "mongosh (the MongoDB shell) is not on your PATH — skipping the connection test."
  info "The server will still tell you if it cannot connect."
fi

# ---------------------------------------------------------------------------
# 6. Optional seeding
# ---------------------------------------------------------------------------
if [ "$MONGO_READY" -eq 1 ]; then
  step "Demo data"
  printf "    Seed 4 demo users, 12 posts and 24 comments?\n"
  warn "This CLEARS the '$DB_NAME' database first."
  if ask "Seed demo data?"; then
    if npm run seed; then
      ok "Demo data created"
      info "Log in with  ada@example.com  /  Password123"
    else
      warn "Seeding failed — you can retry later with: npm run seed"
    fi
  else
    info "Skipped. Run it anytime with: npm run seed"
  fi
fi

# ---------------------------------------------------------------------------
# Done
# ---------------------------------------------------------------------------
printf "\n${GREEN}${BOLD}  Setup complete.${RESET}\n\n"
printf "  ${BOLD}Start the app (backend + frontend, two separate servers):${RESET}\n"
printf "    cd .. && npm run dev:all\n\n"
printf "  ${BOLD}Then open:${RESET}\n"
printf "    http://localhost:5173\n\n"

if [ "$MONGO_READY" -ne 1 ]; then
  printf "  ${YELLOW}${BOLD}Before starting, make sure MongoDB is running:${RESET}\n"
  printf "    brew services start %s\n\n" "$MONGO_FORMULA"
fi

printf "  ${DIM}In VS Code: Cmd+Shift+P → \"Tasks: Run Task\" → \"5. Start dev server\"${RESET}\n"
printf "  ${DIM}Or press F5 to run with the debugger attached.${RESET}\n\n"
