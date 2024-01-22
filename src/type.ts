export interface Data {
    deploy: Array<Deploy>
    objects: Array<Objects>
}

export interface Deploy {
    route: string,
    title: string,
    description: string,
    readtime: string,
    category: string,
    md_path: string,
    md_url: string,
    thumbnail: string

}

export interface Objects {
    path: string,
    url: string
}

