const express = require('express')
const cookieParser = require('cookie-parser')
const fetch = require('node-fetch')

let app = express()
app.use(express.urlencoded({extended: true}))
app.use(cookieParser())
app.set('view-engine', 'ejs')
let ReqCache = {
    foobar: "https://oauth.clarkbains.com/ffff"
}
let CatalogCache = [
     [/oauth\.clarkbains/i, ["admin"]]
]
app.get('/verify', (req,res)=>{
    res.redirect(`https://discord.com/api/oauth2/authorize?client_id=901386863955304488&redirect_uri=https%3A%2F%2Foauth.clarkbains.com%2Fcallback&response_type=code&scope=identify%20guilds&state=${"foobar"}`)
})
app.get('/health', (req,res)=>{
    res.status(200).send("OK!")
})

app.get('/ffff', (req,res)=>{
    res.send("Good!")
})

app.get('/callback', async (req,res)=>{
    const { code, state } = req.query;
    console.log(code, state)

	if (code) {
		try {
			const oauthResult = await fetch('https://discord.com/api/oauth2/token', {
				method: 'POST',
				body: new URLSearchParams({
					client_id: "901386863955304488",
					client_secret: "",
					code,
					grant_type: 'authorization_code',
					redirect_uri: `https://oauth.clarkbains.com/callback`,
					scope: 'identify',
				}),
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded',
				},
			});

			const oauthData = await oauthResult.json();
            console.log(oauthData)
			const self = await fetch(t, headers = {'Authorization': `Bearer ${oauthData["access_token"]}`})
            const selfData = await self.json()
            console.log(selfData)
		} catch (error) {
			// NOTE: An unauthorized token will not throw an error;
			// it will return a 401 Unauthorized response in the try block above
			console.error(error);
		}
	}

	return res.send("OK")

})

app.listen(8888)
