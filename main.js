const Logger = require('./lib/logger.js')
const Meural = require('./lib/meural.js')

const logger = new Logger()
var fs = require("fs");

async function main (filesToUpload) {
  var content = fs.readFileSync("settings.json");
  logger.log(content)
  var settings = JSON.parse(content);

  // Settings contains username, password, and the token

  logger.log("User Name:" + settings.username);
  logger.log(" Password:" + settings.password);

  const meural = new Meural(
    settings.username,
    settings.password
  )

  let gallery;
  let canvas;

  // logger.log(`logging into meural as ${meural.credentials.username}`)
  await meural.authenticate()
  logger.log(`using meural token ${meural.token}`)
  
  // fs.writeFile( "./settings.json", JSON.stringify(settings, null, 4), (err) => {
  //   if (err) throw err;
  //   console.log('The file has been saved!');
  // });

  // load the meural canvas we want to use
  const canvases = await meural.devices()
  canvas = canvases[0]
  logger.log(`controlling meural canvas "${canvas.alias}" (#${canvas.id})`)

  // create the gallery if needed
  let galleryName = settings.galleryName
  let galleryDescription = settings.galleryDescription
  let galleryOrientation = canvas.orientation
  gallery = await meural.galleryCreate(galleryName, galleryDescription, galleryOrientation)
  logger.log(`using gallery "${gallery.name}" (#${gallery.id})`)

  logger.log( "Files to upload: ${filesToUpload.length}")
  // then upload them
  for (var i=0; i<filesToUpload.length; i++) {
    logger.log(filesToUpload[i]);

    // upload it
    const image = await meural.upload(filesToUpload[i])
    logger.log(`uploaded image (#${image.id})`)
    
    // // add the image to the gallery
    await meural.addItemToGallery(image, gallery)
    logger.log(`image (#${image.id}) added to gallery ${gallery.name} (#${gallery.id})`)
  }

  // tell the canvas to use the gallery
  await meural.useGallery(canvas, gallery)
  logger.log(`canvas ${canvas.alias} (#${canvas.id}) using gallery (#${gallery.id})`);
}

async function runWithCatch (method, path) {
  try {
    await method(path)
  } catch (error) {
    if (error.response) {
      logger.logError(error, {
        data: JSON.stringify(error.response.data)
      })
    } else if (error.request) {
      logger.logError(error, error.request)
    } else {
      logger.logError(error)
    }

    process.exit(0)
  }
}

var path = process.argv[2];

logger.log( "Directory path " + path)

fs.stat(path, function(err, stats) {
  if (!stats) {
    logger.error("Path does not exist!");
    process.exit(-1);
  }
  if (!stats.isDirectory()) {
    logger.log('Path is not a directory');
    process.exit(-2);
  }
});

let filesToUpload = [];
// get the files in the directoru and add tem to filesToUpload
fs.readdir(path, function(err, items) {
  // logger.log(items);
  for (var i=0; i<items.length; i++) {
    // logger.log(items[i]);
    filesToUpload.push( path + "/" + items[i] );
  }
});
logger.log("TOTAL NUMBER OF FILES TO UPLOAD: " + filesToUpload.length)

runWithCatch(main,filesToUpload)
