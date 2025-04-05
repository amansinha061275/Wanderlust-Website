const jio = require('joi');

module.exports.listingSchema = jio.object({
  listing : jio.object({
   title : jio.string().required(),
   description : jio.string().required(),
   location : jio.string().required(),
   country : jio.string().required(),
   price : jio.number().required().min(0),
   image : jio.string().allow("",null),
  }).required(),
});

module.exports.reviewSchema =jio.object({
   review:jio.object({
     rating:jio.number().required().min(1).max(5),
     comment:jio.string().required(),
   }).required(),
});