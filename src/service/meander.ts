import Canvas           from "./canvas"
import { range }        from "lodash"
import Node             from "./node"
import {
  tMatrix      ,
  MeanderConfig
}                       from "../util/types"
import * as Rx          from 'rxjs'
import Utils            from "../util/util"

export default class MeanderCanvas extends Canvas {
  config          : MeanderConfig
  polygonLength   : number
  angle           : number
  scaleFactor     : number
  lastX           : number
  lastY           : number
  clicks          : number
  subs            : any
  offset          : any
  lastTransX      : any 
  lastTransY      : any

  constructor(
    selector       : string        ,
    config         : MeanderConfig ,
  ){
    super(selector)
    this.config = config
    this.scaleFactor = 1.1;
    this.lastX = this.canvas.width/2;
    this.lastY = this.canvas.height/2;
    this.lastTransX = this.lastX;
    this.lastTransY= this.lastY;
    this.clicks = 0;
    this.offset = [null,null];
    this.init()
  }
  // zoom = (clicks:any) => {
  //   // var pt = (this.ctx as any).transformedPoint(this.lastX,this.lastY)// ;
  //   // this.ctx.translate(pt.x,pt.y);
  //   if(clicks === -1){
  //     this.clicks = 0
  //   }
  //   this.clicks += clicks
  //   var factor = Math.pow(this.scaleFactor,this.clicks + clicks);
  //   this.ctx.scale(factor,factor);
  //   this.draw();
  // }
  // resetClicks(){
  //   while(this.clicks !== 0){
  //     if(this.clicks >= 0){
  //       var factor = Math.pow(this.scaleFactor,-1);
  //       this.ctx.scale(factor,factor);
  //       this.clicks -= 1;
  //     } else {
  //       var factor = Math.pow(this.scaleFactor,1);
  //       this.ctx.scale(factor,factor);
  //       this.clicks += 1;
  //     }
  //   }
  // }
  init(){
    //console.log("init", this.config)
    this.ctx.fillRect (0,0,this.canvas.width/2, this.canvas.height/2)
    this.ctx.translate( this.canvas.width /2 , this.canvas.height/2 )

    this.ctx.save()
    this.ctx.fillStyle = "black";
    this.ctx.scale(0.15,0.15);
    this.ctx.transform(1,0,0,1,0,0)

    this.ctx.fillStyle = "black"
    this.ctx.fillRect( 0, 0 , this.canvas.width , this.canvas.height)

    this.ctx.translate( this.canvas.width /2 , this.canvas.height/2 )

    this.canvas.addEventListener('click', (evt:any) => {

      this.lastX = evt.offsetX || (evt.pageX - this.canvas.offsetLeft);
      this.lastY = evt.offsetY || (evt.pageY - this.canvas.offsetTop);
      this.offset = [this.lastX, this.lastY];
      this.ctx.translate( this.lastX - this.canvas.width /2 , this.lastY - this.canvas.height /2 )

      this.ctx.fillStyle = 'red';
      this.ctx.fillRect(0,0,10, 10)
      //console.log("Cleeeek", this.offset);
      this.draw();
    })
    this.angle   = ((Math.PI * 2) / this.config.sides)
    this.draw();
  }

  draw(){


    let savedPos = this.generateSpacing(this.config.sides).map((n:any,i:any, c:any) => {
      let x  = this.config.sideLength * Math.sin(n)
      let y  = this.config.sideLength * Math.cos(n)
      let x1 = this.config.sideLength * Math.sin((c[i+1])? c[i+1] : c[0])
      let y1 = this.config.sideLength * Math.cos((c[i+1])? c[i+1] : c[0])
      let a  = ( x1 - x )
      let b  = ( y1 - y )
      let slope = b/a
      let sideAngle = (a < 0) ? Math.PI + Math.atan(slope) : Math.atan(slope)
      return { x , y , sideAngle }
    })

    //let totalLength = this.config.sideLength * Math.pow(4/3, this.config.depth )
    let source:any;
    let numberOfSegments  = Math.pow( this.config.motifConfig.length , this.config.depth);
    let polygonSideLength = this.config.sideLength * 2 * Math.sin(this.angle/2)
    let segmentLength     = polygonSideLength * Math.pow((1/3), this.config.depth)
    let numSegments       = (this.config.fitToSide) ? numberOfSegments :  this.config.numSegments
    
    source =
      ( this.config.noAnimation )
        ? Rx.Observable.from(range( numSegments ))
        : Rx.Observable.interval(1).take(numSegments)

    this.subs = range(this.config.sides).map((n:number) => {
      return source.subscribe( (x:any) => {
        let getAxis = this.triangulate(segmentLength, x, savedPos[n].sideAngle, this.config.flip)

        let newX = savedPos[n].x + getAxis('x')
        let newY = savedPos[n].y + getAxis('y')

        let dx     = getAxis('x') - savedPos[n].x;
        let dy     = getAxis('y') - savedPos[n].y;
        let slope  = dy/dx;
        let rad    = Math.atan(slope)
        let scale  = fn => Math.abs(Math.floor(fn(rad) * (255/Math.PI)));
        let tan = scale(Math.tan);
        let sin = scale(Math.sin);
        let cos = scale(Math.cos);

        this.drawLine(savedPos[n].x, savedPos[n].y, newX, newY, this.config.lineWidth || 3,
                      `rgba(${sin},${cos},${tan},1)`)

        savedPos[n].x = newX;
        savedPos[n].y = newY;

      })
    })

  }
  public cleanup(){
    this.subs.forEach((x:any) => {
      x.unsubscribe()
    })
  }
  triangulate =
    ( segmentLength:number, count:number, baseRotation:number, flip: boolean) =>
    (axis: string) => segmentLength * ( axis === 'x' ? Math.cos : Math.sin )
                      ((flip ? -1 : 1) * this.getAngleFromIndex( count, this.config.motifConfig.length ) + baseRotation  );

  getAngleFromMotifConfig( input:number){
    return this.config.motifConfig[input]
  }
  getAngleFromIndex(index:number, base:number){
    // Convert to base and get the corresponding angle
    return index.toString(base)
      .split('')
      .map( (x:any) => this.getAngleFromMotifConfig(parseInt(x)))
      .reduce((acc: number, cur: number) => acc += cur , 0)
  }
  generateSpacing = (sides:number) => range(sides).map( n => n * ((Math.PI * 2)/sides));
}

