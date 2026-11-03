# Sample tables for Milestone 2 report

## Q1 · county table (sample rows; includes KY and PA rows to show missing data)

|   county_fips | state   | county        |   pop18plus | DIABETES_adj   | DIABETES_adj_lo   | DIABETES_adj_hi   | DIABETES_quintile   | CHD_adj   | OBESITY_adj   |
|--------------:|:--------|:--------------|------------:|:---------------|:------------------|:------------------|:--------------------|:----------|:--------------|
|         01001 | AL      | Autauga       |       46253 | 11.4           | 9.8               | 13.2              | 4                   | 5.6       | 39.5          |
|         06037 | CA      | Los Angeles   |     7710575 | 11.6           | 10.4              | 12.8              | 4                   | 4.8       | 26.4          |
|         08031 | CO      | Denver        |      589711 | 7.8            | 6.7               | 9.0               | 1                   | 4.5       | 21.6          |
|         21001 | KY      | Adair         |       15466 | NA             | NA                | NA                | NA                  | NA        | NA            |
|         36061 | NY      | New York      |     1381420 | 8.4            | 7.5               | 9.4               | 1                   | 4.4       | 19.5          |
|         42101 | PA      | Philadelphia  |     1226065 | NA             | NA                | NA                | NA                  | NA        | NA            |
|         46102 | SD      | Oglala Lakota |        8652 | 23.8           | 21.3              | 26.6              | 5                   | 11.4      | 47.7          |

## Q1 · national summary (age-adjusted, per measure)

| measure                |   n_counties |   n_missing |   min |   p10 |   median |   p90 |   max |   p90_minus_p10 | lowest_county     | highest_county    |
|:-----------------------|-------------:|------------:|------:|------:|---------:|------:|------:|----------------:|:------------------|:------------------|
| Diabetes               |         2956 |         187 |   6   |   8.7 |     10.7 |  14.2 |  23.8 |             5.5 | Douglas, CO       | Oglala Lakota, SD |
| Coronary heart disease |         2956 |         187 |   3.8 |   5   |      5.9 |   7   |  11.4 |             2   | Falls Church, VA  | Oglala Lakota, SD |
| High blood pressure    |         2956 |         187 |  21   |  28.4 |     32.8 |  39.8 |  53.1 |            11.4 | Boulder, CO       | Holmes, MS        |
| Obesity                |         2956 |         187 |  17.1 |  31.4 |     38.2 |  43   |  54   |            11.6 | San Francisco, CA | Perry, AL         |
| COPD                   |         2956 |         187 |   3.2 |   5.2 |      6.8 |   9.1 |  15   |             3.9 | Los Alamos, NM    | Oglala Lakota, SD |

## Q2 · NYC tract table (sample rows)

|   tract_fips | borough       |   pop18plus | small_pop_flag   |   DIABETES_crude |   DIABETES_crude_lo |   DIABETES_crude_hi |   DIABETES_county_crude |   DIABETES_minus_county |
|-------------:|:--------------|------------:|:-----------------|-----------------:|--------------------:|--------------------:|------------------------:|------------------------:|
|  36005000100 | Bronx         |        3760 | False            |             12.3 |                10.9 |                13.7 |                    16.1 |                    -3.8 |
|  36005000200 | Bronx         |        3714 | False            |             12.1 |                10.6 |                13.7 |                    16.1 |                    -4   |
|  36047000100 | Brooklyn      |        3872 | False            |              6.5 |                 5.6 |                 7.3 |                    12   |                    -5.5 |
|  36047000200 | Brooklyn      |         919 | False            |             10.9 |                 9.7 |                12.2 |                    12   |                    -1.1 |
|  36061000201 | Manhattan     |        1660 | False            |             19.2 |                17.4 |                21.3 |                     8.9 |                    10.3 |
|  36061000202 | Manhattan     |        6061 | False            |             16.6 |                15   |                18.6 |                     8.9 |                     7.7 |
|  36081000101 | Queens        |        3854 | False            |              7.1 |                 6.3 |                 8   |                    14.3 |                    -7.2 |
|  36081000102 | Queens        |        6428 | False            |              3.8 |                 3.3 |                 4.3 |                    14.3 |                   -10.5 |
|  36085000300 | Staten Island |        1955 | False            |             12.6 |                11.1 |                14.2 |                    11.9 |                     0.7 |
|  36085000600 | Staten Island |        2403 | False            |             15.3 |                13.5 |                17.2 |                    11.9 |                     3.4 |

## Q2 · borough summary, diabetes (tracts with 500+ adults)

| borough       |   n_tracts |   county_estimate |   tract_min |   tract_p10 |   tract_median |   tract_p90 |   tract_max |   p90_minus_p10 |   pct_tracts_gt3pts_from_county |   pct_tracts_above_county |
|:--------------|-----------:|------------------:|------------:|------------:|---------------:|------------:|------------:|----------------:|--------------------------------:|--------------------------:|
| Bronx         |        341 |              16.1 |         5.9 |        10.8 |           15.1 |        19.2 |        23.1 |             8.4 |                            35.8 |                      39.9 |
| Brooklyn      |        774 |              12   |         2.9 |         6.2 |           11.3 |        15.6 |        30.1 |             9.4 |                            39.7 |                      38.8 |
| Manhattan     |        298 |               8.9 |         1.7 |         4.6 |            7.2 |        15.1 |        28.8 |            10.5 |                            54   |                      34.9 |
| Queens        |        679 |              14.3 |         2.8 |         9.6 |           13.4 |        16.4 |        24.2 |             6.8 |                            29.5 |                      32   |
| Staten Island |        118 |              11.9 |         8.6 |         9.5 |           11.6 |        14.8 |        27.6 |             5.3 |                            11.9 |                      40.7 |