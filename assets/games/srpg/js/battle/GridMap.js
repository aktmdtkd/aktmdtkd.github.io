export class GridMap {
    constructor() {
        this.rows = 0;
        this.cols = 0;
        this.data = []; // 0:평지, 1:산, 2:물
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

    // [이 부분이 빠져 있었습니다!]
    isValid(x, y) {
        return x >= 0 && x < this.cols && y >= 0 && y < this.rows;
    }
}