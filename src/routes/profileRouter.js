const express = require("express");
const { Profile } = require("../controllers/index.controller");
const Profiles = require("../models/profileSchema")
const multer = require("multer")
const path = require("path")
const fs = require ("fs-extra")
const profileRouter = express.Router();
const generatePDF = require("../pdfConfig/pdfCreator")
const { Transform, Parser} = require("json2csv");

// As we have a controller folder for scalability the logic should be kept out of here
// We call only the controller methods

//  profileRouter.get("/", Profile.getAll);

// profileRouter.post("/", Profile.create);



profileRouter.get("/", async (req, res) => {
    const profilesCount = await Profiles.countDocuments();

    try {
        const query = req.query;
        const { limit, skip, sort } = query;
        delete query.limit;
        delete query.skip;
        delete query.sort;
        const profileList = await Profiles.find(query)
            .sort({ [sort]: 1 })
            .limit(parseInt(limit))
            .skip(parseInt(skip));

        res.send({ Total: profilesCount, profileList });
    } catch (error) {
        console.log(error);
        res.status(500).send(error);
    }
});



profileRouter.get("/:id", async (req, res) => {
    try {
        const profile = await Profiles.findById(req.params.id);
        if (profile) {
            res.send(profile);
        } else {
            res.status(404).send("Cannot find the profile with the id");
        }
    } catch (error) {
        console.log(error);
        res.status(500).send(error);
    }
});

profileRouter.get("/username/:username", async (req, res) => {
    try {
        let username = {username: req.params.username}
        const profile = await Profiles.findOne(username);
        if (profile) {
            res.send(profile);
        } else {
            res.status(404).send("Cannot find the profile with the username");
        }
    } catch (error) {
        console.log(error);
        res.status(500).send(error);
    }
});




//get all experiences for a profile.username
profileRouter.get("/:username/experiences", async (req, res) => {
    try {
        console.log(req.params.username);
        const profile = await Profiles.findOne(
            { username: req.params.username },
            { experience: 1, _id: 0 }
        )
        res.send(profile.experience);
    } catch (error) {
        console.log(error);
        res.status(500).send(error);
    }
});



//get one experience with ID
profileRouter.get("/experiences/:expId/", async (req, res) => {
    try {
        const experience = await Profiles.find(
            { "experience._id": req.params.expId },
            { _id: 0, "experience.$": 1 }
        );
        res.send(experience);
    } catch (error) {
        console.log(error);
        res.status(500).send(error);
    }
});


profileRouter.get("/pdf/:username/cv", async (req,res)=>{
    try {
      const profileToPDF = await Profiles.findOne({username: req.params.username})
      if (!profileToPDF){
          res.status(404).send("Not Found")
      }
      else{
         await generatePDF(profileToPDF)
              console.log(profileToPDF.username)
          const file = path.join(__dirname, `../pdfConfig/${profileToPDF.username}.pdf`);
          res.setHeader("Content-Disposition", `attachment; filename=${req.params.username}.pdf`);
    fs.createReadStream(file).pipe(res);
      }
    } catch (error) {
      console.log(error)
      res.status(500).send(error)
    }  
  });
  
//Download the experiences as a CSV
// userName/experiences/CSV
profileRouter.get("/user/experiences/:username/CSV", async(req,res)=>{
   try {      
    const profile = await Profiles.findOne(
        { username: req.params.username },
        {  _id: 0,  experience: 1 }
    )
    ;

     if(profile){

        let experienceArray = profile.experience
        console.log(experienceArray)

/*
        
// const filePath = path.join(__dirname, experienceArray);

  const fields = ["title", "role", "company", "startDate"];
  const opts = { fields };

  const json2csv = new Transform(opts);

console.log("hey", json2csv)

res.setHeader("Content-Disposition", `attachment; filename=file.csv`);

  fs.createReadStream(experienceArray)
    .pipe(json2csv)
    
     .pipe(res)

*/

        
        const json2csvParser = new Parser({ header: true });
        const csvData = json2csvParser.parse(experienceArray);

        fs.writeFile("newCSV.csv", csvData, function(error) {
          if (error) throw error;
          console.log("done newCSV.csv successfully!");
        });

/*


 const filePath = path.join(__dirname, experienceArray);

   const csvName = 'users'

const csvPath = path.join(__dirname, `../../images/file.csv`)

   
     const stream = fs.createReadStream(filePath)
     stream
       .pipe(json2csv)
       .pipe(fs.createWriteStream(csvPath))
     
       stream.on("close", async ()=>{
        console.log("close")
        console.log((await fs.readFile(csvPath)).toString())
         res.send("CSV SENT") 
       })


       */

     }
   } catch (error) {
      console.log(error)
      res.status(500).send(error) 
   }
})



profileRouter.post("/", async (req,res)=>{
    // let newInfo = {...req.body, 
    //     createdAt: new Date()}
    
        try {
            const newProfile= await Profiles.create(req.body)
            
            newProfile.save()
            res.send(newProfile)
    
    
        } catch (error) {
            res.status(500).send(error)
            console.log(error)
        }
});


const multerConfig = multer({})
profileRouter.post("/:username/picture", multerConfig.single("profileImg"), async (req, res) => {   
   
    try {
        
        const fileName = req.params.username + path.extname(req.file.originalname)

    const newImageLocation = path.join(__dirname, "../../images", fileName) 
    await fs.writeFile(newImageLocation, req.file.buffer)


    


    req.body.imageUrl = req.protocol + "://" + req.get("host") + "/images/" + fileName




    const newProfileUrl = await Profiles.findOneAndUpdate({username: req.params.username}, {
        $set: {"imageUrl": req.body.imageUrl}
    })


    newProfileUrl.save()
    res.send("Image URL updated")



    } catch (ex) {
      res.status(500).send(ex);
      console.log(ex);
    }
  });


profileRouter.put("/:id", async (req,res)=>{

    delete req.body._id
  

    try {
        const profileForEdit = await Profiles.findByIdAndUpdate(req.params.id, {
            $set:{
                ...req.body,updatedAt: new Date()
            }
        })

        if(profileForEdit){
            res.send("Updated!")
        }
      
    else  {
        res.status(404).send(`profile with id: ${req.params.id} is not found !`)
    }  
       
        
    } catch (error) {
        console.log(error);
        res.status(500).send(error);
    }

});

profileRouter.delete("/:id", async (req, res) => {
    try {
        const deletedProfile = await Profiles.findByIdAndDelete(req.params.id);

        if (deletedProfile) res.status(200).send(" Successffully Deleted");
        else
            res.status(404).send(
                `profile with id: ${req.params.id} not found for deletion!`
            );
    } catch (error) {
        console.log(error);
        res.status(500).send(error);
    }
});


profileRouter.post("/experience/:username", async (req,res)=>{
    // let newInfo = {...req.body, 
    //     createdAt: new Date()}
    
        try {
            const newProject = req.body;
const addProfileExperience = await Profiles.findOneAndUpdate({username: req.params.username},
     {
       $push: {experience: newProject}
     }
   );
     console.log(addProfileExperience)
   res.send(addProfileExperience)
    
    
        } catch (error) {
            res.status(500).send(error)
            console.log(error)
        }
});





/**
 * 
 *
 
 try {
        
    } catch (error) {
        console.log(error);
        res.status(500).send(error);
    }

 * */




module.exports = profileRouter;
