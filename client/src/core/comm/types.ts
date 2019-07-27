export interface AssetList {
    [inode: string]: AssetList | AssetFile[];
}

export interface AssetFile {
    name: string;
    hash: string;
}

export interface Asset {
    id: number;
    name: string;
    file_hash?: string;
    children?: Asset[];
}
