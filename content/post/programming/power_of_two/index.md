---
title: "leetcode - Power of Two"
date: 2025-08-12
cover: images/leetcode.png
tags: ["programming", "easy"]
categories:
    - "programming"
---

# Power of Two

## Description

*Given an integer `n`, return `true` if it is a power of two. Otherwise, return `false`.*

*An integer `n` is a power of two, if there exists an integer `x` such that `n == 2x`*

#### ***Example 1:***

***Input:** n = 1*
***Output:** true*
***Explanation:** 20 = 1*

#### ***Example 2:***

***Input:** n = 16*
***Output:** true*
***Explanation:** 24 = 16*

#### ***Example 3:***

***Input:** n = 3*
***Output:** false*

***Constraints:***

- *`-231 <= n <= 231 - 1`*

## Solve

```javascript
var isPowerOfTwo = function(n) {
    
    if(n == true ){ return true } else if(n == false){return false};

    let response = true

    let binario = n.toString(2);

    const numberToArray = n => [...`${n}`].map(i => parseInt(i));
    binario = numberToArray(binario)

    binario.shift()
    let sum = 0
    for(let number = 0; number<=binario.length; number++){
        sum += binario[number]
        sum += 1
        if(sum > binario.length){response = false; break}
    }

    return response

};
```
