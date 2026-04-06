<h1 align="center">RiftApp</h1>

<p align="center">
  <b>Fast · Clean · Yours</b><br/>
  <i>Real-time communication, built for clarity and control.</i>
</p>

<p align="center">
  Chat · Voice · DMs · Self-host or Cloud
</p>

<br/>

<p align="center">
  <img src="https://img.shields.io/badge/Self--Hosted-Free-5865F2?style=for-the-badge">
  <img src="https://img.shields.io/badge/Cloud-Available-23272A?style=for-the-badge">
  <img src="https://img.shields.io/badge/Rift%20Pro-$4.99%2Fmo-5865F2?style=for-the-badge">
</p>

---

## What is RiftApp?

<p>
RiftApp is a modern communication platform that combines <b>chat</b>, <b>voice</b>, <b>DMs</b>, and <b>shared spaces</b> into one fast, minimal experience.
</p>

<ul>
  <li><b>Self-host it</b> for full control</li>
  <li>Or use <b>Rift Cloud</b> for zero setup</li>
</ul>

<p><i>Software should feel fast, stay out of your way, and belong to you.</i></p>

---

## Run Rift your way

<table>
<tr>
<td width="50%" valign="top">

### Self-Hosted (Free)

<ul>
  <li>Full control over your data</li>
  <li>No subscriptions</li>
  <li>Deploy in seconds with Docker</li>
</ul>

<p><b>Your servers. Your rules.</b></p>

</td>
<td width="50%" valign="top">

### Rift Cloud

<ul>
  <li>No setup required</li>
  <li>Global infrastructure</li>
  <li>Automatic updates & scaling</li>
</ul>

</td>
</tr>
</table>

---

## Quick start (Docker)

<p><b>1. Create a compose file:</b></p>

<pre><code>services:
  rift:
    image: ghcr.io/your-org/riftapp:latest
    ports:
      - "3000:3000"
    env_file:
      - .env
</code></pre>

<p><b>2. Run:</b></p>

<pre><code>docker compose up -d
</code></pre>

<p>That’s it. Rift is now running.</p>

---

## Rift Pro

<p><b>$4.99/month</b> or <b>$49.99/year</b></p>

<table>
<tr>
<td width="50%" valign="top">

### Free (Cloud)

<ul>
  <li>Standard chat & voice</li>
  <li>Global entrance sound</li>
  <li>Base streaming quality</li>
</ul>

</td>
<td width="50%" valign="top">

### Rift Pro

<ul>
  <li><b>Higher video quality & FPS</b></li>
  <li><b>Per-hub entrance sounds</b></li>
  <li>Advanced customization</li>
  <li>Priority performance</li>
</ul>

</td>
</tr>
</table>

<p><i>Rift Pro enhances the experience — it doesn’t lock core features.</i></p>

---

## Comparison

<table>
<tr>
<th>Feature</th>
<th>RiftApp</th>
<th>Discord</th>
<th>Fluxer</th>
</tr>

<tr>
<td>Self-hosting</td>
<td>✅ Full support</td>
<td>❌</td>
<td>⚠️ Limited</td>
</tr>

<tr>
<td>Free plan quality</td>
<td>✅ High</td>
<td>⚠️ Limited</td>
<td>⚠️ Limited</td>
</tr>

<tr>
<td>Streaming quality</td>
<td>✅ High (Pro unlocks more)</td>
<td>⚠️ Paywalled</td>
<td>⚠️ Limited</td>
</tr>

<tr>
<td>Customization</td>
<td>✅ Extensive</td>
<td>⚠️ Limited</td>
<td>⚠️ Basic</td>
</tr>

<tr>
<td>Per-server features</td>
<td>✅ Yes (Pro)</td>
<td>⚠️ Partial</td>
<td>❌</td>
</tr>

<tr>
<td>Privacy control</td>
<td>✅ Full (self-host)</td>
<td>❌</td>
<td>⚠️ Partial</td>
</tr>

<tr>
<td>Ads</td>
<td>❌ None</td>
<td>⚠️ Some experiments</td>
<td>⚠️ Unknown</td>
</tr>

<tr>
<td>Price</td>
<td>💜 $4.99/mo</td>
<td>💸 ~$9.99/mo</td>
<td>💸 Varies</td>
</tr>

</table>

---

## Why Rift?

<ul>
  <li><b>Blazing fast</b> — no laggy UI</li>
  <li><b>Clean structure</b> — no clutter</li>
  <li><b>Flexible</b> — self-host or cloud</li>
  <li><b>Privacy-first</b></li>
</ul>

---

## Project structure

<table>
<tr><th>Path</th><th>Description</th></tr>
<tr><td><code>backend/</code></td><td>API & realtime systems</td></tr>
<tr><td><code>frontend/</code></td><td>Web client</td></tr>
<tr><td><code>app/</code></td><td>Desktop app</td></tr>
<tr><td><code>ARCHITECTURE.md</code></td><td>Technical details</td></tr>
</table>

---

## Philosophy

<ul>
  <li>No clutter</li>
  <li>No lock-in</li>
  <li>No bloat</li>
</ul>

<p><b>Just fast, clean communication — on your terms.</b></p>

---

## License

<p><i>Private. All rights reserved.</i></p>
