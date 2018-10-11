
/**
* Use this file to define custom functions and blocks.
* Read more at https://makecode.microbit.org/blocks/custom
*/

/**
* Custom blocks
*/
//% weight=100 color=#444A84 icon="\uf051" advanced=false block="DOT Step TEST"
namespace stepcounter {
    //background variables
    let sampleRate: number = 20                     // samples PER SECOND to take from the accelerometer

    let secretSteps: number = 0                     // our actual step count
    let sampleArray: number[] = []                  // accelerometer readings
    let lastStepTime: number = 0                    // when we last had a step
    let rate: number[] = []
    let minStrength: number = 8192                  // accelerometer strength varies so max/min are used
    let maxStrength: number = 0                     // to calculate a threshold value for different people
    let minTime: number = 800                       // milliseconds within which two peaks are /not/ two steps
    let maybeSteps: number[] = [0, 0, 0]            // array of minimal number of steps (three) we should count
    let thresholdMultiplier: number = 0.58          // percentage of max at which we start to be sure a thing is a step
    let stepThreshold: number = 1500                // initial threshold of strength
    let thresh: number = stepThreshold              // moving threshold
    let sampleIntervalMS: number = 1000 / sampleRate
    let singleStepTime: number = 200
    let sampleCounter: number = 0
    let Peak: number = 512
    let Trough: number = 512
    let amp: number = 100
    let firstStep: boolean = true                   // }  This represents which step we are looking for next.
    let secondStep: boolean = false                 // }  We don't want to start counting steps at every movement.
    let thirdStep: boolean = false                  // }  We could also represent this as Steps [0, 0, 0] but names are easy to follow.
    let stepping: boolean = false                   // Are we actually in a set of steps right now?
    let signal: number = 0                          // This is the number we'll usually be working on
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

    export function processLatestSample() {
        sampleCounter += sampleIntervalMS
        let N = sampleCounter - lastStepTime

        if (signal < thresh && N > singleStepTime) {
            if (signal < Trough) {
                Trough = signal
            }
        }
        if (signal > thresh && signal > Peak) {
            Peak = signal
        }

        if (N > singleStepTime) {
            if ((signal > thresh) && (stepping == false) && (N > 3 * singleStepTime / 5)) {
                stepping = true
                singleStepTime = sampleCounter - lastStepTime
                lastStepTime = sampleCounter

                if (thirdStep) {
                    thirdStep = false
                    secretSteps += 2                        // The two valid steps that came before, which we have not yet counted
                    for (let i = 0; i < 10; i++) {
                        rate[i] = singleStepTime
                    }
                }
                if (secondStep) {
                    secondStep = false
                    thirdStep = true
                    return
                }
                if (firstStep) {
                    firstStep = false
                    secondStep = true
                    return
                }

                let runningTotal: number = 0
                for (let i = 0; i < 9; i++) {
                    rate[i] = rate[i + 1]
                    runningTotal += rate[i]
                }
                rate[9] = singleStepTime
                runningTotal += rate[9]
                singleStepTime = runningTotal / 10            // This improves our original guess
                stepping = true
                secretSteps++

            }
            if (signal < thresh && stepping == true) {          // values are going down
                stepping = false
                amp = Peak - Trough
                thresh = (amp / 2) + Trough
                Peak = thresh
                Trough = thresh
            }
            if (N > 3000) {
                thresh = stepThreshold
                Peak = 512
                Trough = 512
                lastStepTime = sampleCounter
                firstStep = true
                secondStep = false
                thirdStep = false
                stepping = false
                amp = 100
            }
        }
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
                signal = getAccelStrength()
                processLatestSample()
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
