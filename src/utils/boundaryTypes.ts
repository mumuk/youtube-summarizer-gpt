export interface Block {
    id: string;
    text: string;
    [key: string]: unknown;
}

export interface BoundaryPair {
    prevId: string;
    currId: string;
    prevText: string;
    currText: string;
}

export interface BoundaryEdit {
    prevId: string;
    currId: string;
    merged: string | null;
    firstClean: string | null;
    secondClean: string | null;
}
