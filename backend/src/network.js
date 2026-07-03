import { Agent, setGlobalDispatcher } from 'undici'

// Node's built-in fetch (undici) can fail with ETIMEDOUT on machines that have
// a non-internet-routable IPv6 address (e.g. a Tailscale/VPN interface) — it
// races IPv4/IPv6 connection attempts and the phantom IPv6 route can make the
// whole request fail even though IPv4 works fine. Force IPv4-only connections
// for fetch() so outbound calls to GitHub/GitLab/SMTP2GO don't intermittently
// fail with "Unexpected server error." Must run before any fetch() call.
setGlobalDispatcher(new Agent({ connect: { family: 4 } }))
