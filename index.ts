import { db, db_disconnect } from "./db";
import { blog } from "./db/schema";
import { Data, Deploy, Objects } from "./src/type"
import { readdirSync, readFileSync, writeFile } from "fs"
import { join } from "path"
import { createClient } from '@supabase/supabase-js'

import * as dotenv from "dotenv";
import { eq } from "drizzle-orm";
dotenv.config();
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON!)

main().finally(() => {
    db_disconnect().finally(() => console.log("DB DISCONNECTED"))
})

async function main() {
    let object_files = [""]
    let data = read_data_file() as Data;
    console.log("=========STARTED HANDLE DEPLOY=========")
    await handle_deploy(data.deploy)
    console.log("=========COMPLETED HANDLE DEPLOY=========")
    console.log("=========STARTED HANDLE OBJECTS=========")
    await handle_objects(data.objects)
    console.log("=========COMPLETED HANDLE OBJECTS=========")

    write_data_file(data)
}

function read_data_file() {
    let content = readFileSync('./data.json', 'utf8')
    let data = JSON.parse(content)
    return data;
}

function write_data_file(content: Data) {
    writeFile('./data.json', JSON.stringify(content), () => { });
}

async function handle_deploy(deploy_content: Array<Deploy>) {
    let db_result = await db.select().from(blog);

    let db_map = new Map();
    for (let i = 0; i < db_result.length; i++) {
        db_map.set(db_result[i].route, db_result[i])
    }

    for (let i = 0; i < deploy_content.length; i++) {
        let post = deploy_content[i]

        let mk_file = deploy_content[i].md_path
        let blog_content = readFileSync(mk_file);
        await supabase
            .storage
            .from('open')
            .upload(mk_file, blog_content, {
                upsert: true
            })
        const url = getPublicUrl(mk_file)
        deploy_content[i].md_url = url;

        if (db_map.has(post.route)) {
            const new_blog = {
                title: post.title,
                route: post.route,
                description: post.description,
                readtime: post.readtime,
                category: post.category,
                markdown: post.md_url,
                thumbnail: post.thumbnail
            };
            await db.update(blog).set(new_blog).where(eq(blog.route, post.route));
            db_map.delete(post.route)
            console.log("UPDATED ROUTE: ", post.route)
        }
        else {
            const new_blog = {
                title: post.title,
                route: post.route,
                description: post.description,
                readtime: post.readtime,
                category: post.category,
                markdown: post.md_url,
                thumbnail: post.thumbnail
            };
            await db.insert(blog).values(new_blog);
            console.log("INSERTED ROUTE: ", post.route)
        }
    }

    for (const [key] of db_map) {
        await db.delete(blog).where(eq(key, blog.route))
        console.log("DELETED ROUTE: ", key)
    }

}

function getPublicUrl(file: string) {
    const { data } = supabase
        .storage
        .from('open')
        .getPublicUrl(file)
    return data.publicUrl;
}

async function handle_objects(objects_content: Array<Objects>) {
    let force = false;
    console.log("Do You want to Force update objects [y/n]? ")

    let obj_map = new Map();
    for (let i = 0; i < objects_content.length; i++) {
        obj_map.set(objects_content[i].path, objects_content[i])
    }

    for (const file of readAllFiles('./assets/')) {
        let fileExist = obj_map.has(file);
        if (force || !fileExist) {
            let obj_content = readFileSync(file);
            await supabase.storage.from('open').upload(file, obj_content, {
                contentType: 'image/png'
            })
            const url = getPublicUrl(file)
            objects_content.push({
                path: file,
                url: url
            })
            console.log("UPLOADED FILE: ", file)
        }
    }
}

export function* readAllFiles(dir: string): Generator<string> {
    const files = readdirSync(dir, { withFileTypes: true });

    for (const file of files) {
        if (file.isDirectory()) {
            yield* readAllFiles(join(dir, file.name));
        } else {
            yield join(dir, file.name);
        }
    }
}
