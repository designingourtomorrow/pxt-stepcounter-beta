
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
    let sampleLengthMS: number = 2000
    let sampleIntervalMS: number = Math.round(1000 / sampleRate)

    let minimumStepThreshold: number = 3            // number of steps before we decide we are walking
    let tempStepCount: number = 0                   // how many possible but not certain steps we have taken

    let secretSteps: number = 0                     // our actual step count
    let sampleArray: number[] = []                  // accelerometer readings
    let smoothedValues: number[] = []               // slightly smoothed out readings to get rid of local bumpiness

    let lastStepTime: number = 0                    // when we last had a step (how many milliseconds since the micro:bit woke up)
    let rate: number[] = []                         // Holds step rate, which is not massively useful frankly

    let rising: number = 0

    let minTime: number = 500                       // milliseconds within which two peaks are /not/ two steps

    let averageAccel: number = 0
    let triggerOffset: number = 50
    // Not going to use this YET: let singleStepTime: number = 500                // This is a tricky thing to guess, but we need to.  Should set per user.
    let maximumStepTime: number = 2000
    let sampleTimer: number = 0
    let Peak: number = 0
    let Trough: number = 2000
    let amp: number = 0

    for (let i = 0; i < sampleLengthMS / sampleIntervalMS; i++) {
        sampleArray.push(triggerOffset)
        smoothedValues.push(triggerOffset)
    }


    /**
     * sets the sensitivity of the step counter - use a high number if you walk gently
     * @param value eg: 50
     */
    //% block "set sensitivity to $value percent"
    //% value.min=0
    //% value.max=100
    //% advanced=true
    export function setSensitivity(value: number) {
        triggerOffset = 100 - value
    }

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
    //% block "map to 25 using low of $value and high of $target"
    export function mapTo25(value: number, target: number): number {
        return integerMap(value, 0, target, 0, 25) - 1
    }

    function resetStep() {
        tempStepCount = 0
        sampleTimer = 0
        Peak = 512
        Trough = 512
        lastStepTime = input.runningTime()
        amp = 0
        sampleTimer = 0
    }

    /**
    * returns total acceleration strength, allowing us to do simple zero-crossing in any dimensions
    * Accel Strength is mostly rotation-agnostic.
    */
    //% block="acceleration strength"
    //% advanced=true
    export function getAccelStrength(): number {
        let X: number = input.acceleration(Dimension.X)
        let Y: number = input.acceleration(Dimension.Y)
        let Z: number = input.acceleration(Dimension.Z)
        return X + Y + Z
    }

    /**
    * time between samples (ms)
    */
    //% block="sample interval (ms)"
    export function getSampleInterval() {
        return sampleIntervalMS
    }

    /**
    * returns  calculated stepThreshold
    */
    //% block="stepThreshold"
    //% advanced=true
    export function getStepThreshold(): number {
        return averageAccel + triggerOffset
    }

    /** 
     * get last item from raw sample array
     */
    //% block="raw sample"
    //% advanced=true
    export function getRawSample():number {
        return sampleArray[sampleArray.length - 1]
    }

    /** 
     * get last item from smoothed sample array
     */
    //% block="smoothed sample"
    //% advanced=true
    export function getSmoothedSample():number {
        return smoothedValues[smoothedValues.length - 1]
    }


    //% block
    export function getLatestSample() {
        sampleArray.push(getAccelStrength())
        sampleArray.shift()
    }

    let smoothingCoefficient: number = 3
    //% block
    //% advanced=true
    export function smoothSample() {
        if (sampleArray.length < smoothingCoefficient) {
            smoothingCoefficient = sampleArray.length
        }
        let temp: number = 0
        for (let i = 0; i < smoothingCoefficient; i++) {
            temp += sampleArray[sampleArray.length - (smoothingCoefficient + 1) - i] * (smoothingCoefficient - i)
        }
        let newSample = Math.round(temp / (smoothingCoefficient * smoothingCoefficient))
        smoothedValues.push(newSample)
        if (newSample > Peak) {
            Peak = newSample
        }
        if (newSample < Trough) {
            Trough = newSample
        }
        let discard: number = smoothedValues.shift()
        if (discard <= Trough) {
            Trough = Math.min(smoothedValues[0], newSample)
        }

        if (discard >= Peak) {
            Peak = Math.max(smoothedValues[0], newSample)
        }
        amp = Peak - Trough
        averageAccel += Math.round((newSample / smoothedValues.length) - (discard / smoothedValues.length))
    }

    function isValidStepTime(): boolean {
        if (lastStepTime + minTime < input.runningTime()) {
            return true
        }
        return false
    }

    /**
     * set time per step in milliseconds (because people walk and run differently)
     * @param value eg: 500
     */
    //% block="set minTime to $value"
    export function setMinTime(value: number) {
        minTime = value
    }

    //% block
    export function processLatestSample() {

        smoothSample()  // now we work on smoothedValues instead of the noisy samples

        // checks if the peak in a new sample is really the Peak.
        if (smoothedValues[smoothedValues.length - 1] > (smoothedValues[smoothedValues.length - 2]) && (getSmoothedSample() > getStepThreshold())) {
            // we are rising.
            rising = 1
        }

        else if (rising == 1 && isValidStepTime() && (getSmoothedSample() < getStepThreshold()) && smoothedValues[smoothedValues.length - 1] < smoothedValues[smoothedValues.length - 2]) {
            rising = 0
            secretSteps += areWe()
            timeStamp()
        }
        if (sampleTimer > 2000) {
            resetStep()
        }
        // make sure we're definitely timed out since timestamp (lastStepTime)
        // then record 'we stepped'.
    }

    function areWe(): number {
        if (tempStepCount < minimumStepThreshold) {
            tempStepCount += 1
            return 0
        }
        if (tempStepCount == minimumStepThreshold) {
            tempStepCount += 1
            return tempStepCount
        }
        return 1
    }

    function timeStamp() {
        sampleTimer = input.runningTime() - lastStepTime
        lastStepTime = input.runningTime()
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
