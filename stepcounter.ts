
/**
 * Use this file to define custom functions and blocks.
 * Read more at https://makecode.microbit.org/blocks/custom
 */

/**
 * Custom blocks
 */
//% weight=100 color=#0fbc11 icon="\uf463" advanced=false block="DOT Step Test"
namespace stepcounter {
    //background secret variable
    let secretSteps = 0

    /**
     * helper function for mapping in integers
     */
    function integerMap(value: number, inputLow: number, inputHigh: number, outputLow: number, outputHigh: number): number {
        return (value - inputLow) * (outputHigh - outputLow) / (inputHigh - inputLow) + outputLow
    }

    /**
     * helper function for mapping calculation brings any number to 25
     */
    //% block
    export function mapTo25(value: number, target: number): number {
        return integerMap(value, 0, target, 0, 25) -1
    }

    /**
     * randomise steps for testing
     */
    //% block="random number for testing"
    export function randomiseSteps(): void {
        secretSteps = Math.randomRange(1, target)
    }
    /**
     * set a target and count steps in the background
     * @param target, eg: 1000
     */
    //% block="turn on step counter"
    export function countStepsTo(): void {
        // Dummy 'counter'
        secretSteps = Math.randomRange(1, 1024)
    }

    /**
     * TODO: describe your function here
     * @param value describe value here, eg: 5
     */
    //% block="screenGraph up to $target"
    export function graphOnScreen(target: number): void {
        let value = secretSteps
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
                led.plot(0,(index/5))
            }
        }
    }
}
