
/**
 * Use this file to define custom functions and blocks.
 * Read more at https://makecode.microbit.org/blocks/custom
 */

/**
 * Custom blocks
 */
//% weight=100 color=#444A84 icon="\uf051" advanced=false block="DOT Step Counter"
namespace stepcounter {
    //background variables
    let secretSteps: number = 0                     // our actual step count
    let sampleArray: number[] = []                  // accelerometer readings
    let lastStepTime: number = input.runningTime()  // when we last had a step
    let minStrength: number = 8192                  // accelerometer strength varies so max/min are used
    let maxStrength: number = 0                     // to calculate a threshold value for different people
    let minTime: number = 800                       // milliseconds within which two peaks are /not/ two steps
    let maybeSteps: number[] = [0, 0, 0]            // array of minimal number of steps (three) we should count
    let sampleRate: number = 20                     // samples PER SECOND to take from the accelerometer
    let thresholdMultiplier: number = 0.58          // percentage of max at which we start to be sure a thing is a step
    let stepThreshold: number = 1500                // initial threshold of strength
    
     /**
     * helper function for mapping in integers
     * we use this instead of 'map' because we always want to scale to 25, so we use this to make it easy behind the scenes
     */
    export function integerMap(value: number, inputLow: number, inputHigh: number, outputLow: number, outputHigh: number): number {
        return (value - inputLow) * (outputHigh - outputLow) / (inputHigh - inputLow) + outputLow
    }

     /**
     * helper function for mapping calculation brings any number to 25
     * this means we can use the LEDs to graph nicely
     * @param value describe value here eg: 216
     * @param target describe target here eg: 10000
     */
    // block "map to 25 using low of $value and high of $target"
    export function mapTo25(value: number, target: number): number {
        return integerMap(value, 0, target, 0, 25) - 1
    }

     /**
     * returns square root of added squares of 3 directions
     * Accel Strength is pythagorean and therefore mostly rotation-agnostic.
     */
    export function getAccelStrength(): number {
        let X: number = input.acceleration(Dimension.X)
        let Y: number = input.acceleration(Dimension.Y)
        let Z: number = input.acceleration(Dimension.Z)
        return Math.sqrt(X * X + Y * Y + Z * Z)
    }
    
    /** 
    * used primarily once we move the sample data to where we will examine it to see if there is a 'step' in there
    */
    export function blankSampleArray(): void {
        sampleArray = []
    }
    
    /**
     * randomise steps for testing, up to target
     */
    // block="random number for testing"
    export function randomiseSteps(): void {
        secretSteps = Math.randomRange(0, 250)
    }

    /**
     * count steps using accelerometer and update sample array
     * Simple algorithm for testing
     */
    //% block="turn on step counter"
    export function turnOnCounterForever(): void {
        // start sample array
        blankSampleArray()
        while (1) {
            if (getAccelStrength() > stepThreshold && input.runningTime() - lastStepTime > minTime) {
                lastStepTime = input.runningTime()
                secretSteps++
            }
            basic.pause(10)
        }
        
    }

    /**
    * graphs 'number' out of 'target' on the LED screen
    * @param value describe value here, eg: 5, 9, 3
    * @param target describe target here, eg, 100
    */
    //% block="screenGraph $value out of $target"
    //% value.min=0
    export function graphOnScreen(value: number, target: number): void {
        if (value > target) {
            value = target
        }
        let screenValue = mapTo25(value, target)
        if (screenValue == 0) {
            basic.clearScreen()
        } else {
            basic.clearScreen()
            basic.pause(500)
            for (let index = 0; index <= screenValue; index++) {
                led.plot(0, (index / 5))
            }
        }
    }
    /**
     * get the number of steps walked so far
     */
    //% block="step count"
    export function getSecretSteps(): number {
        return secretSteps
    }
}
