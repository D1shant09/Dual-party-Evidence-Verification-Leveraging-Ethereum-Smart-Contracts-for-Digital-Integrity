const { PinataSDK } = require("pinata-web3")
const fs = require("fs");
const { File } = require("buffer");

const pinata = new PinataSDK({
  pinataJwt: process.env.PINATA_JWT,
  pinataGateway: process.env.PINATA_GATEWAY
})

async function upload(){
  try {
    const blob = new Blob([fs.readFileSync("./sample.pdf")]);
    const file = new File([blob], "sample.pdf", { type: "application/pdf" });
    const upload = await pinata.upload.file(file);
    console.log(upload);
    return upload;
  } catch (error) {
    console.log(error)
  }
}

async function get(data) {
    try {
        const pinata = new PinataSDK({
            pinataJwt: process.env.PINATA_JWT,
            pinataGateway: process.env.PINATA_GATEWAY || "gateway.pinata.cloud"
          })
      const file = await pinata.gateways.get(data)
      console.log(file.data)
    } catch (error) {
      console.log(error);
    }
  }
  
async function App() {
    let data=await upload();
    await get(data.IpfsHash);
}

App();