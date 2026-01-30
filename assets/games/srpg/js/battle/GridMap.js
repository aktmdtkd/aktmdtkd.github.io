export class GridMap {
    constructor() {
        this.rows = 0;
        this.cols = 0;
        this.data = [];
    }

    load(mapData) {
        this.rows = mapData.rows;
        this.cols = mapData.cols;
        this.data = mapData.terrain;
    }

    getTerrain(x, y) {
        if (x < 0 || x >= this.cols || y < 0 || y >= this.rows) return null;
        return this.data[y][x];
    }

    isValid(x, y) {
        return x >= 0 && x < this.cols && y >= 0 && y < this.rows;
    }
}