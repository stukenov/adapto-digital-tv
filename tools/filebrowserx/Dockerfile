FROM filebrowser/filebrowser:s6

# Install iproute2 for tc, and any minimal tools needed for shaping
RUN apk add --no-cache iproute2 iptables

# Add s6 init script to configure bandwidth limits on startup
RUN mkdir -p /etc/cont-init.d
COPY 10-tc.sh /etc/cont-init.d/10-tc.sh
RUN chmod +x /etc/cont-init.d/10-tc.sh

# Keep entrypoint/cmd from base image (filebrowser)
# No additional configuration here; compose will provide volumes and env


