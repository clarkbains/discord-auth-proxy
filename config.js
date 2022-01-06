const { env } = require('process');
module.exports = {
    PROJECT_NAME: env["PROJECT_NAME"],
    DISCORD_TOKEN: env["DISCORD_TOKEN"],
    COOKIE_SIGNER: env["COOKIE_SIGNER"],
    CLIENT_SECRET: env["CLIENT_SECRET"],
    CLIENT_ID: env["CLIENT_ID"],
    PORT: Number(env["NOMAD_PORT_http"] || 8888)

}