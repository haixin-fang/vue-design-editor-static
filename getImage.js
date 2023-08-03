// 解析dom中的img标签 下载到本地 并图片去重 解析图片信息生成json文件
console.log(process.argv);
const fs = require("fs");
const crypto = require("crypto");
const hashList = require("./hash.json");
const imglist = require("./imglist.json");
const buffer = require("node:buffer");
const https = require("https");
var Jimp = require("jimp");

if (!process.argv[2]) {
  return console.log("没有参数");
}
const name = process.argv[2];
const htmlStr = fs.readFileSync(__dirname + "/web/" + name, "utf-8");
let imgStrs = htmlStr.match(/(?<=(img[^>]*src="))[^"]*/g);
imgStrs = imgStrs.filter((item) => {
  let reg = /\.(jpg|jpeg|png|gif)$/;
  const res = item.match(reg);
  if (res && res[0]) {
    return item;
  }
});
console.log(imgStrs, "------图片标签");

async function getImageInfo(url) {
  return new Promise((resolve) => {
    new Jimp(url, function (err, image) {
      var w = image.bitmap.width; //  width of the image
      var h = image.bitmap.height; // height of the image
      //   console.log(image.bitmap);
      resolve(image.bitmap);
    });
  });
}
async function createImage() {
  for (let i = 0; i < imgStrs.length; i++) {
    const url = imgStrs[i];
    const { width, height, data } = await getImageInfo(url);
    const hash = getFileHash(data);
    console.log(Buffer.isBuffer(data));
    const blob = new buffer.Blob(data);
    if (!hashList.includes(hash)) {
      let reg = /\.(jpg|jpeg|png|gif)$/;
      const filetype = url.match(reg)[0];
      hashList.push(hash);
      const info = {
        width,
        height,
        url: hash + filetype,
        type: url.match(reg)[1],
      };
      console.log(data);
      //   fs.writeFileSync("./image/" + hash + filetype, data);
      await download(url, hash, filetype);
      //   console.log("成功", __dirname + "/image/" + hash + filetype);
      imglist.push(info);
    }
    fs.writeFileSync(__dirname + "/hash.json", JSON.stringify(hashList, null, 4));
    fs.writeFileSync(__dirname + "/imglist.json", JSON.stringify(imglist, null, 4));
  }
}
function download(url, hash, name) {
  return new Promise((resolve) => {
    https
      .get(url, (response) => {
        //data 存储图片数据，是二进制流
        var data = "";
        // 一定要设置encode，否则即使在pic/downImg/中有1.jpg,也是无法显示的
        response.setEncoding("binary");
        // 当数据到达时会触发data事件
        response.on("data", function (chunk) {
          data += chunk;
        });
        // 当数据接收完毕之后，会触发end事件
        response.on("end", function () {
          //写入文件
          fs.writeFile("./image/" + hash + name, data, "binary", (err) => {
            if (err) {
              console.log("写入文件错误");
            } else {
              console.log("写入文件成功");
              resolve();
            }
          });
        });
      })
      .on("error", function () {
        console.log("读取错误");
      });
  });
}
createImage();
/**
 * 获取文件hash
 * @param {*} path
 * @returns
 */
function getFileHash(stream) {
  //5aa13a3e83c77be71724efebc689a93c
  var fsHash = crypto.createHash("md5");
  //无视换行符发布
  var str = stream.toString().replace(/\r\n/g, "").replace(/\n/g, "");
  // var str = stream.toString();
  fsHash.update(str);
  var md5 = fsHash.digest("hex");
  return md5;
}
