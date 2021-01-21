import { CdkDragEnd } from '@angular/cdk/drag-drop';
import { Component, Input } from '@angular/core';

interface ColorScheme {
    channels: ColorChannel[];
}

interface ColorChannel {
    name: string;

    class: string;

    points: { x: number, y: number }[];
}

module SVG {
    const SMOOTHING = .1;

    export type Point = { x: number, y: number };

    const line = (pointA: Point, pointB: Point) => {
        const lengthX = pointB.x - pointA.x;
        const lengthY = pointB.y - pointA.y;

        const length = Math.sqrt(Math.pow(lengthX, 2) + Math.pow(lengthY, 2));

        return { length, angle: Math.atan2(lengthY, lengthX) };
    }

    const controlPoint = (current: Point, previous: Point, next: Point, reverse: boolean) => {

        // When 'current' is the first or last point of the array
        // 'previous' or 'next' don't exist.
        // Replace with 'current'
        const p = previous || current
        const n = next || current

        // Properties of the opposed-line
        const o = line(p, n)

        // If is end-control-point, add PI to the angle to go backward
        const angle = o.angle + (reverse ? Math.PI : 0)
        const length = o.length * SMOOTHING

        // The control point position is relative to the current point
        const x = current.x + Math.cos(angle) * length
        const y = current.y + Math.sin(angle) * length

        return { x, y };
    }

    const bezierCommand = (point: Point, i: number, a: Point[]) => {
        // start control point
        const cps = controlPoint(a[i - 1], a[i - 2], point, false);

        // end control point
        const cpe = controlPoint(point, a[i - 1], a[i + 1], true)

        return `C ${cps.x},${cps.y} ${cpe.x},${cpe.y} ${point.x},${point.y}`
    }

    export const svgPath = (points: Point[], sizeX: number) => {
        if (points.length === 0) {
            return '';
        }

        const sorted = [...points];

        const first = points[0];
        const last = points[points.length - 1];

        sorted.unshift({
            x: last.x - sizeX,
            y: last.y
        });

        sorted.push({
            x: first.x + sizeX,
            y: first.y
        });

        sorted.sort((lhs, rhs) => {
            return lhs.x - rhs.x;
        });

        let path = `M ${sorted[0].x},${sorted[0].y}`;

        for (let i = 1; i < sorted.length; i++) {
            const point = sorted[i];

            path += ` ${bezierCommand(point, i, sorted)}`
        }

        return path;
    }
}

@Component({
    selector: 'app-color-scheme-editor',
    templateUrl: './color-scheme-editor.component.html',
    styleUrls: ['./color-scheme-editor.component.scss']
})
export class ColorSchemeEditorComponent {
    @Input()
    public scheme: ColorScheme;

    public selectedChannel: ColorChannel;

    public sizeX = 500;
    public sizeY = 300;

    public xScale = 12;
    public yScale = 100;

    public get width() {
        return `${this.sizeX}px`;
    }

    public get height() {
        return `${this.sizeY}px`;
    }

    public get channels() {
        return this.scheme.channels;
    }

    public elements: { svg: string, points: SVG.Point[] }[] = [];

    constructor() {
        this.scheme = {
            channels: [{
                name: 'Red',
                points: [
                    { x: 1, y: 10 },
                    { x: 2, y: 20 },
                    { x: 3, y: 10 },
                    { x: 4, y: 40 },
                    { x: 5, y: 10 },
                    { x: 6, y: 100 },
                    { x: 7, y: 10 },
                    { x: 8, y: 40 },
                    { x: 9, y: 10 },
                    { x: 10, y: 20 },
                    { x: 11, y: 40 }
                ],
                class: 'red'
            }, {
                name: 'Green',
                points: [
                    { x: 1, y: 10 },
                    { x: 2, y: 20 },
                    { x: 3, y: 10 },
                    { x: 4, y: 40 },
                    { x: 5, y: 10 },
                    { x: 6, y: 20 },
                    { x: 7, y: 10 },
                    { x: 8, y: 40 },
                    { x: 9, y: 10 },
                    { x: 10, y: 20 },
                    { x: 11, y: 40 }
                ],
                class: 'green'
            }, {
                name: 'Blue',
                points: [
                    { x: 1, y: 10 },
                    { x: 2, y: 20 },
                    { x: 5, y: 10 },
                    { x: 6, y: 20 },
                    { x: 7, y: 10 },
                    { x: 3, y: 10 },
                    { x: 4, y: 40 },
                    { x: 8, y: 40 },
                    { x: 9, y: 10 },
                    { x: 10, y: 20 },
                    { x: 11, y: 40 },
                    { x: 12, y: 10 },
                ],
                class: 'blue'
            }]
        }

        this.selectedChannel = this.scheme.channels[0];

        for (const channel of this.scheme.channels) {
            const points = this.getRenderPoints(channel);

            this.elements.push({ points, svg: SVG.svgPath(points, this.sizeX) });
        }
    }

    public selectChannel(channel: ColorChannel) {
        this.selectedChannel = channel;
    }

    public onMoved(index: number, channel: ColorChannel, event: CdkDragEnd) {
        const element = this.elements[this.channels.indexOf(channel)];

        const points = [...element.points];
        const point = points[index];

        points[index] = {
            x: point.x + event.distance.x,
            y: point.y + event.distance.y
        };

        this.elements[this.channels.indexOf(channel)].svg = SVG.svgPath(points, this.sizeX);
    }

    public onMoveEnded(index: number, channel: ColorChannel, event: CdkDragEnd) {
        let newX = event.source.freeDragPosition.x + event.distance.x;
        let newY = event.source.freeDragPosition.y + event.distance.y;

        if (newY < 0) {
            newY = 0;
        } else if (newY > this.sizeY) {
            newY = this.sizeY;
        }

        if (newX < 0) {
            newX = 0;
        } else if (newX > this.sizeX) {
            newX = this.sizeX;
        }

        channel.points[index].x = +(newY / this.sizeX) * this.xScale;
        channel.points[index].y = -(newY / this.sizeY) * this.yScale + this.yScale;

        const element = this.elements[this.channels.indexOf(channel)];

        element.points[index].x = newX;
        element.points[index].y = newY;

        element.svg = SVG.svgPath(element.points, this.sizeX);
    }

    private getRenderPoints(channel: ColorChannel) {
        const points: SVG.Point[] = [];

        for (const point of channel.points) {
            const x = Math.round(this.sizeX * (0 + point.x / this.xScale));
            const y = Math.round(this.sizeY * (1 - point.y / this.yScale));

            points.push({ x, y });
        }

        return points;
    }
}