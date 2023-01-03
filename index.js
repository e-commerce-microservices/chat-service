const express = require('express')

const app = express()
const port = 3000

app.get("/", (req, res) => {
    res.setHeader("Content-Type", "plain/text")
    res.send({
        code: 200
    })
})

app.listen(port, () => {
    console.log(`app listening on port: ${port}`)
})