import { parse } from "csv-parse";
import { createReadStream } from "node:fs";
import pgPromise from "pg-promise";

export default class CsvToDb {
  parser;
  dataArray = [];
  totalCounter = 0;
  counter = 0;
  table;
  pgp = pgPromise();
  resolve = null;
  db;

  /**
   * Must give either config object or pgp object, if both are given
   * then it defaults to db object given
   * @param {Object} [config] - Database config
   * @param {Object} [db] - pgp object
   * @throws {Error} needs either config object or pgp
   */
  constructor(config, db) {
    if (!config && !db) {
      throw new Error(
        "Object requires either a config object of pgp preconnected to db"
      );
    }
    if (db) {
      this.db = db;
    } else {
      this.db = this.pgp(config);
    }
  }

  /**
   * Takes in a csv filename and inserts each row into the Postgres table
   * @param {String} fileName - Name of CSV
   * @param {Object} table - Information on table being inserted into
   * @param {String[]} table.columns - array of column names in table of db
   * @param {String} table.table - name of table in db
   * @param {Number} start - row to start, default 2
   * @returns {Promise} Promise Resolves reading of csv is finished
   */
  read = async (fileName, table, start) => {
    this.parser = parse({
      columns: table.columns,
      delimiter: ",",
      from: start ? start : 2,
    });

    this.table = table;
    this.setCsvParser();

    return new Promise((resolve, reject) => {
      try {
        this.resolve = resolve;
        createReadStream(fileName)
          .pipe(this.parser)
          .on("end", () => {
            console.log("CSV upload done");
          })
          .on("error", reject);
      } catch (e) {
        console.log(e);
      }
    });
  };

  /**
   * Sets listeners for parser
   * 'readable' - when parser is passed csv data
   * 'error' - when parser errors
   * 'end' - happens when parser reaches end
   */
  setCsvParser = () => {
    this.parser.on("readable", async () => {
      let data;
      while ((data = this.parser.read()) !== null) {
        this.dataArray.push(data);
        this.counter++;
        this.totalCounter++;

        if (this.counter === 10000) {
          const insertString = this.pgp.helpers
            .insert(this.dataArray, this.table.columns, this.table.table)
            .replaceAll(`'Unknown'`, "NULL");
          this.counter = 0;
          this.dataArray = [];
          console.log(this.totalCounter);
          await this.db.none(insertString + " ON CONFLICT DO NOTHING");
        }
      }
    });

    this.parser.on("error", (err) => {
      console.log(err);
    });

    this.parser.on("end", async () => {
      // Inserts remaining data
      if (this.dataArray.length > 0) {
        console.log(this.totalCounter);
        let insertString = this.pgp.helpers
          .insert(this.dataArray, this.table.columns, this.table.table)
          .replaceAll(`'Unknown'`, "NULL");
        await this.db.none(insertString + " ON CONFLICT DO NOTHING");
      }
      this.counter = 0;
      this.totalCounter = 0;
      this.dataArray = [];
      this.resolve();
      console.log("Inserting Done");
    });
  };
}
