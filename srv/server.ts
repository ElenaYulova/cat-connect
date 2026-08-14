import cds from "@sap/cds";
import express from "express";
import Module from "module";
import path from "path";

// Fix for impl
if (process.env.NODE_ENV !== "production") {

    
    const originalResolveFilename = (Module as any)._resolveFilename;

    (Module as any)._resolveFilename = function (request: string, parent: any, isMain: boolean, options: any) {
        if (
            request === "sales-service" ||
            request === "/home/user/projects/cat-connect/sales-service" ||
            request.endsWith("cat-connect/sales-service")
        ) {

            const absoluteTSPath = path.resolve(__dirname, "sales-service.ts");

            return originalResolveFilename.call(this, absoluteTSPath, parent, isMain, options);
        }
        return originalResolveFilename.call(this, request, parent, isMain, options);
    };
}

// Fix for CORPS
cds.on("bootstrap", (app: express.Application) => {
    if (process.env.NODE_ENV !== "production") {
        app.use((req, res, next) => {
            res.setHeader("Access-Control-Allow-Origin", "http://localhost:8090");
            res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
            res.setHeader("Access-Control-Allow-Headers", "*");
            res.setHeader("Access-Control-Expose-Headers", "OData-Version, OData-MaxVersion");
            if (req.method === "OPTIONS") {
                res.sendStatus(200);
            } else {
                next();
            }
        });
    }
});
