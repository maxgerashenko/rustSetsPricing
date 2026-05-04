# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Purpose

A web app for the game Rust that lets users define clothing/skin sets by pasting a list of item names, then displays each item's image and price (individual and total) fetched live from the Steam Market API.

## Steam Market API

Item prices are fetched from the Steam Community Market. Rust's Steam App ID is `252490`.

Price endpoint pattern:
```
https://steamcommunity.com/market/priceoverview/?appid=252490&currency=1&market_hash_name=<URL-encoded-item-name>
```
Returns `{ success, lowest_price, median_price, volume }`.

Item images are retrieved via the Steam Market search/item detail endpoints or by constructing icon URLs from item asset data.

## Key Behaviors

- User inputs a newline- or comma-separated list of item names (e.g. `Burlap Shirt`, `Leather Gloves`)
- App resolves each name against Steam Market, displays thumbnail image, unit price, and quantity
- Total cost of the set is summed and displayed
- Steam Market rate-limits aggressively — requests must be throttled or batched carefully
- Avoid using ! use == false or true instead
- Use val as local variable for string functions instead of it
- add empty line before return and expect 
- use empty line before and after if return untill there a several in a row
- use flat structure for if statemsnts instead of nested when posible
- try to break the expectoin with if return early in functoin when posible to avoid if wrapping
- use lambda functoin when funcstion are shor or straight forward 
- use help functoin instead of computaions in template, try use 
   template for represetation not computations  
- avoind single letter variables use short verstion as num, val, so on