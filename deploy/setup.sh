#!/usr/bin/env bash
# One-time EC2 instance setup for Relay production deployment
# Run as root (or with sudo) on a fresh Amazon Linux 2023 instance
set -euo pipefail

echo "=== Relay Production Setup ==="

# Update system
echo "Updating system packages..."
dnf update -y

# Install Docker
echo "Installing Docker..."
dnf install -y docker
systemctl enable docker
systemctl start docker

# Install Docker Compose plugin
echo "Installing Docker Compose plugin..."
mkdir -p /usr/local/lib/docker/cli-plugins
ARCH=$(uname -m)
curl -SL "https://github.com/docker/compose/releases/latest/download/docker-compose-linux-${ARCH}" \
  -o /usr/local/lib/docker/cli-plugins/docker-compose
chmod +x /usr/local/lib/docker/cli-plugins/docker-compose
docker compose version

# Install AWS CLI (for S3 backups)
echo "Installing AWS CLI..."
if ! command -v aws &>/dev/null; then
  dnf install -y aws-cli
fi

# Install git
echo "Installing git..."
dnf install -y git

# Create app user and add to docker group
echo "Setting up app user..."
if ! id -u relay &>/dev/null; then
  useradd -r -m -s /bin/bash relay
fi
usermod -aG docker relay

# Allow ec2-user to use docker too
usermod -aG docker ec2-user

# Create application directory
echo "Creating application directories..."
mkdir -p /opt/relay
chown relay:relay /opt/relay

# Create data directories
mkdir -p /opt/relay/data/postgres
mkdir -p /opt/relay/data/caddy
mkdir -p /opt/relay/backups
chown -R relay:relay /opt/relay/data
chown -R relay:relay /opt/relay/backups

# Set up log rotation for Docker
echo "Configuring Docker log rotation..."
cat > /etc/docker/daemon.json << 'EOF'
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
EOF
systemctl restart docker

# Configure firewall
echo "Configuring firewall..."
if command -v firewall-cmd &>/dev/null; then
  # Amazon Linux 2023 uses firewalld
  systemctl enable firewalld
  systemctl start firewalld
  firewall-cmd --permanent --add-service=ssh
  firewall-cmd --permanent --add-service=http
  firewall-cmd --permanent --add-service=https
  firewall-cmd --reload
  firewall-cmd --list-all
else
  echo "No firewall manager found. Relying on AWS Security Group rules."
fi

# Harden SSH (disable password auth)
echo "Hardening SSH..."
if grep -q "^PasswordAuthentication" /etc/ssh/sshd_config; then
  sed -i 's/^PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
else
  echo "PasswordAuthentication no" >> /etc/ssh/sshd_config
fi
systemctl restart sshd

# Set up cron for database backups (runs as relay user)
echo "Setting up backup cron..."
crontab -u relay - << 'CRON'
# Daily database backup at 3 AM UTC
0 3 * * * /opt/relay/deploy/backup-db.sh >> /opt/relay/backups/backup.log 2>&1
CRON

echo ""
echo "=== Setup Complete ==="
echo ""
echo "Next steps:"
echo "  1. Clone the repo:  sudo -u relay git clone <repo-url> /opt/relay"
echo "  2. Create env file: cp /opt/relay/deploy/.env.prod.example /opt/relay/deploy/.env.prod"
echo "  3. Edit env file:   nano /opt/relay/deploy/.env.prod"
echo "  4. Deploy:          sudo -u relay /opt/relay/deploy/deploy.sh"
