
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

    let minTime: number = 500                       // milliseconds within which two peaks are /not/ two steps

    let sampleArray: number[] = []                  // accelerometer readings
    let smoothedValues: number[] = []               // slightly smoothed out readings to get rid of local bumpiness

    let lastStepTime: number = 0                    // when we last had a step (how many milliseconds since the micro:bit woke up)
    let rate: number[] = []                         // Holds step rate, which is not massively useful frankly

    let smoothingCoefficient: number = 3            // how many samples do we use to work out 'average'?

    let rising: number = 0

    let averageAccel: number = 0                    // numbers used in our algorithm
    let triggerOffset: number = 50
    let maximumStepTime: number = 2000
    let sampleTimer: number = 0
    let Peak: number = -2000
    let Trough: number = 2000

    let secretSteps: number = 0                     // our actual step count

    for (let i = 0; i < sampleLengthMS / sampleIntervalMS; i++) {  // make sure our arrays are filled to the length we want so calculations don't fall over
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
    //% blockGap=6
    export function setSensitivity(value: number) {
        triggerOffset = 100 - value
    }

    /**
     * set minimum time per step in milliseconds (because people walk and run differently)
     * @param value eg: 500
     */
    //% block="set minTime to $value"
    //% blockGap=20
    export function setMinTime(value: number) {
        minTime = value
    }

    /**
     * measure the acceleration and store it in our secret store
     */
    //% block
    //% blockGap=6
    export function getLatestSample() {
        sampleArray.push(getAccelStrength())
        sampleArray.shift()
    }

    /**
     * get rid on noise (small jiggles) and try to find out if we are in a step
     */
    //% block
    //% blockGap=6
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
    }

    /**
    * time between samples (ms)
    */
    //% block="sample interval (ms)"
    //% blockGap=20
    export function getSampleInterval() {
        return sampleIntervalMS
    }



    /**
   * helper function for mapping in integers
   * we use this instead of 'map' because we always want to scale to 25, so we use this to make it easy behind the scenes
   */
    function integerMap(value: number, inputLow: number, inputHigh: number, outputLow: number, outputHigh: number): number {
        return (value - inputLow) * (outputHigh - outputLow) / (inputHigh - inputLow) + outputLow
    }

    /**
    * helper function for mapping calculation brings any number to 25
    * this means we can use the LEDs to graph nicely
    * @param value describe value here eg: 216
    * @param target describe target here eg: 1000
    */
    function mapTo25(value: number, target: number): number {
        return integerMap(value, 0, target, 0, 25) - 1
    }

    function resetStep() {
        tempStepCount = 0
        sampleTimer = 0
        Peak = 512
        Trough = 512
        lastStepTime = input.runningTime()
        sampleTimer = 0
    }

    /**
    * returns total acceleration strength, allowing us to do simple zero-crossing in any dimensions
    * Accel Strength is mostly rotation-agnostic.
    */
    //% block="acceleration strength"
    //% advanced=true
    //% blockGap=6
    export function getAccelStrength(): number {
        let X: number = input.acceleration(Dimension.X)
        let Y: number = input.acceleration(Dimension.Y)
        let Z: number = input.acceleration(Dimension.Z)
        return X + Y + Z
    }



    /**
    * returns calculated stepThreshold
    */
    //% block="step threshold"
    //% advanced=true
    //% blockGap=6
    export function getStepThreshold(): number {
        return averageAccel + triggerOffset
    }

    /** 
     * get last item from raw sample array
     */
    //% block="raw sample"
    //% advanced=true
    //% blockGap=6
    export function getRawSample(): number {
        return sampleArray[sampleArray.length - 1]
    }

    /** 
     * get last item from smoothed sample array
     */
    //% block="smoothed sample"
    //% advanced=true
    //% blockGap=6
    export function getSmoothedSample(): number {
        return smoothedValues[smoothedValues.length - 1]
    }


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
        averageAccel += Math.round((newSample / smoothedValues.length) - (discard / smoothedValues.length))
    }

    function isValidStepTime(): boolean {
        if (lastStepTime + minTime < input.runningTime()) {
            return true
        }
        return false
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
      * get the number of steps walked so far
      */
    //% block="step count"
    //% blockGap=6
    export function getSecretSteps(): number {
        return secretSteps
    }
    /**
    * graphs 'number' out of 'target' on the LED screen
    * @param value describe value here, eg: 5, 9, 3
    * @param target describe target here, eg: 100
    */
    //% block="graph $value out of $target"
    export function graphOnScreen(value: number, target: number): void {
        if (value < 0) {
            value = 0
        }

        if (target < 1) {
            target = 1
        }

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
  
}
