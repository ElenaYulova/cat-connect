import cds from "@sap/cds";
import express from "express";

// Fix for CORPS problem
cds.on("bootstrap", (app: express.Application) => {
    app.use((req, res, next) => {
        res.setHeader("Access-Control-Allow-Origin", "http://localhost:8082");
        res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
        res.setHeader("Access-Control-Allow-Headers", "*");
        res.setHeader("Access-Control-Expose-Headers", "OData-Version, OData-MaxVersion");

        if (req.method === "OPTIONS") {
            res.sendStatus(200);
        } else {
            next();
        }
    });
});
