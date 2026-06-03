import * as cheerio from 'cheerio';
import fs from "fs"
import { words } from "./words"
import * as deepl from 'deepl-node';
require("dotenv").config()

const findSentence = async (path: string) => {
    try {
        const EXAMPLE_SELECTOR = ".examp"
        const $ = await cheerio.fromURL(`https://dictionary.cambridge.org/dictionary/english/${path}`);
        const examples = $("div").children(EXAMPLE_SELECTOR)
        let longestSentence = ""
        for (let i = 0; i < examples.length; i++) {
            let elementText = $(examples[i]).text()
            if (elementText.length > longestSentence.length) {
                longestSentence = elementText
            }
        }
        return longestSentence
    } catch (e) {
        console.error("Unable to find a sentence for the following word: " + path)
    }
}

const translateSentenceRu = async (sentence: string, translator: deepl.Translator) => {
    try {
        return await translator.translateText(sentence, "en", "ru")
    } catch (e) {
        console.error("Unable to translate the sentence: " + sentence)
    }
}

(async () => {
    const sentences = []
    const translator = new deepl.Translator(process.env.DEEPL_API_KEY as string)
    const unprocessedWords = fs.createWriteStream("./unprocessed_words.txt")

    const writeStream = fs.createWriteStream("./sentences.txt")
    writeStream.write("english|russian\n")

    for (let i = 0; i < words.length; i++) {
        const currWord = words[i]

        const sentence = await findSentence(currWord)
        if (sentence) {
            const translation = (await translateSentenceRu(sentence, translator))?.text
            const wordTranslation = (await translateSentenceRu(currWord, translator))?.text!
            writeStream.write(`${currWord.toUpperCase()} ${sentence}|${wordTranslation.toUpperCase()} ${translation}\n`)
            sentences.push([sentence, translation])
            console.log((i * 100 / words.length).toFixed(2) + "% finished")
        } else {
            unprocessedWords.write(words[i] + "\n")
            console.log("Word unprocessed: " + words[i])
        }
    }
})()
