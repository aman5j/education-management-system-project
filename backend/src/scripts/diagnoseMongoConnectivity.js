
import dotenv from "dotenv";
import dns from "node:dns";
import net from "node:net";
import tls from "node:tls";

dotenv.config();

dns.setServers(["1.1.1.1", "8.8.8.8"]);

const PORT = 27017;
const TIMEOUT_MS = 8000;

const log = (label, value) => {
  console.log(`${label}:`, value);
};

const checkTcp = (host, port) =>
  new Promise((resolve) => {
    const socket = net.createConnection({ host, port });
    let finished = false;

    const finish = (result) => {
      if (finished) return;
      finished = true;
      socket.destroy();
      resolve(result);
    };

    socket.setTimeout(TIMEOUT_MS);

    socket.on("connect", () => finish("PASS"));
    socket.on("timeout", () => finish("TIMEOUT"));
    socket.on("error", (error) =>
      finish(`FAILED — ${error.code || error.message}`)
    );
  });

const checkTls = (host, ip, port) =>
  new Promise((resolve) => {
    const socket = tls.connect({
      host: ip,
      port,
      servername: host,
      rejectUnauthorized: true,
    });

    let finished = false;

    const finish = (result) => {
      if (finished) return;
      finished = true;
      socket.destroy();
      resolve(result);
    };

    socket.setTimeout(TIMEOUT_MS);

    socket.on("secureConnect", () => {
      finish(
        `PASS — TLS ${socket.getProtocol()}, certificate authorized`
      );
    });

    socket.on("timeout", () => finish("TIMEOUT"));

    socket.on("error", (error) =>
      finish(`FAILED — ${error.code || error.message}`)
    );
  });

const run = async () => {
  console.log("");
  console.log("============================================");
  console.log("MONGODB NETWORK CONNECTIVITY DIAGNOSTIC");
  console.log("READ-ONLY — NO DATABASE OPERATIONS");
  console.log("============================================");

  const uri = process.env.MONGO_URI;

  if (!uri) {
    throw new Error("MONGO_URI is missing from backend/.env");
  }

  const parsed = new URL(uri);
  const scheme = parsed.protocol;
  const hostname = parsed.hostname;

  log("Connection scheme", scheme);
  log("MongoDB hostname", hostname);
  log("MongoDB port", parsed.port || PORT);

  if (!hostname) {
    throw new Error("Could not identify MongoDB hostname.");
  }

  let hosts = [];

  if (scheme === "mongodb+srv:") {
    console.log("\n1. DNS SRV lookup");

    try {
      const records = await dns.promises.resolveSrv(
        `_mongodb._tcp.${hostname}`
      );

      console.log("SRV records:", records.length);

      for (const record of records) {
        console.log(
          `- ${record.name}:${record.port} priority=${record.priority}`
        );

        hosts.push({
          host: record.name,
          port: record.port,
        });
      }
    } catch (error) {
      console.log(
        "SRV lookup FAILED:",
        error.code || error.message
      );
    }

    console.log("\n2. DNS TXT lookup");

    try {
      const records = await dns.promises.resolveTxt(hostname);
      console.log("TXT records found:", records.length);
      console.log("TXT contents are intentionally not displayed.");
    } catch (error) {
      console.log(
        "TXT lookup:",
        error.code || error.message
      );
    }
  } else {
    hosts = [{
      host: hostname,
      port: Number(parsed.port || PORT),
    }];
  }

  if (hosts.length === 0) {
    console.log("\nNo MongoDB hosts could be resolved.");
    console.log("Check the connection hostname and DNS configuration.");
    return;
  }

  console.log("\n3. Host DNS, TCP and TLS checks");

  for (const target of hosts) {
    console.log("\n--------------------------------------------");
    log("Host", target.host);
    log("Port", target.port);

    let addresses = [];

    try {
      addresses = await dns.promises.resolve4(target.host);
    } catch (error) {
      console.log(
        "IPv4 DNS lookup:",
        error.code || error.message
      );
    }

    try {
      const ipv6 = await dns.promises.resolve6(target.host);
      console.log("IPv6 addresses:", ipv6.join(", "));
    } catch {
      console.log("IPv6 addresses: none available");
    }

    if (addresses.length === 0) {
      console.log("No IPv4 addresses available; skipping TCP/TLS.");
      continue;
    }

    for (const ip of addresses) {
      log("Resolved IPv4", ip);

      const tcpResult = await checkTcp(ip, target.port);
      log("TCP connectivity", tcpResult);

      if (tcpResult === "PASS") {
        const tlsResult = await checkTls(
          target.host,
          ip,
          target.port
        );

        log("TLS handshake", tlsResult);
      } else {
        console.log("TLS handshake: skipped because TCP failed.");
      }
    }
  }

  console.log("\n============================================");
  console.log("NETWORK DIAGNOSTIC COMPLETE");
  console.log("No database records or collections were accessed.");
  console.log("============================================");
};

run().catch((error) => {
  console.error("\nNETWORK DIAGNOSTIC FAILED");
  console.error(error.message);
  process.exitCode = 1;
});
