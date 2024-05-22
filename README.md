# CsvToDb

## Takes Csv and inserts Data into a database table

- uses pg-promise and csv-parse

## Example

```
import CsvToDb from "@batec2/csvtodb";

const config = {
  host: [ADDRESS_OF_DB],
  port: [PORT_OF_DB],
  user: [USER],
  password: [PASSWORD],
  database: [DB_NAME],
};

//Give object config for db
const importer = new CsvToDb(config);

//Create object that contains column names and table name
const table_info = {
  columns: ["column_name_1","column_name_2","and_so_on"],
  table: "table_name",
};

try {
  //2 is the line in the csv the object starts from
  importer.read("./PATH/TO/CSV", table_info, 2);
} catch (e) {
  console.log(e);
}
```
