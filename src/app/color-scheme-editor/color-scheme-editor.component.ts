import { CdkDragEnd } from '@angular/cdk/drag-drop';
import { Component, Input } from '@angular/core';

interface ColorScheme {
    channels: ColorChannel[];
}

interface ColorChannel {
    name: string;

    class: string;

    points: number[];
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

    export const svgPath = (points: Point[]) => {
        // build the d attributes by looping over the points
        const d = points.reduce((acc, point, i, a) => i === 0 ? `M ${point.x},${point.y}` : `${acc} ${bezierCommand(point, i, a)}` , '')

        return d;
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
                    10,
                    20,
                    10,
                    40,
                    10,
                    20,
                    10,
                    40,
                    10,
                    20,
                    10,
                    40
                ],
                class: 'red'
            }, {
                name: 'Green',
                points: [
                    20,
                    10,
                    40,
                    70,
                    44,
                    12,
                    12,
                    30,
                    22,
                    34,
                    55,
                    60
                ],
                class: 'green'
            }, {
                name: 'Blue',
                points: [
                    30,
                    25,
                    12,
                    50,
                    12,
                    12,
                    54,
                    27,
                    44,
                    12,
                    55,
                    12
                ],
                class: 'blue'
            }]
        }

        this.selectedChannel = this.scheme.channels[0];

        for (const channel of this.scheme.channels) {
            const points = this.getPoints(channel);

            this.elements.push({ points, svg: SVG.svgPath(points) });
        }
    }

    public selectChannel(channel: ColorChannel) {
        this.selectedChannel = channel;
    }

    public onMoved(index: number, channel: ColorChannel, event: CdkDragEnd) {
        const points = this.getPoints(channel);

        points[index + 1].y += event.distance.y;

        this.elements[this.channels.indexOf(channel)].svg =  SVG.svgPath(points);
    }

    public onMoveEnded(index: number, channel: ColorChannel, event: CdkDragEnd) {
        let newY = event.source.freeDragPosition.y + event.distance.y;

        if (newY < 0) {
            newY = 0;
        } else if (newY > this.sizeY) {
            newY = this.sizeY;
        }

        channel.points[index] = 100 - (newY / this.sizeY) * 100;

        const element = this.elements[this.channels.indexOf(channel)];

        element.points[index + 1].y = newY;
        element.svg = SVG.svgPath(element.points);
    }

    private getPoints(channel: ColorChannel) {
        const points: SVG.Point[] = [{
            x: 0, y: this.sizeY
        }];

        for (let i = 0; i < channel.points.length; i++) {
            const totalPositions = channel.points.length;
    
            const widthPerPoint = this.sizeX / totalPositions;
    
            const x = Math.round(widthPerPoint * (i + .5));
            const y = Math.round(this.sizeY * (1 - channel.points[i] / 100));

            points.push({ x, y });
        }

        points.push({ x: this.sizeX, y: this.sizeY });

        return points;
    }
}