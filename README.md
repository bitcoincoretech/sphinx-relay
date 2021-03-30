# Relay

**Relay** is a Node.js wrapper around [LND](https://github.com/lightningnetwork/lnd), handling connectivity and storage for [**Sphinx**](https://sphinx.chat). 
Original Project [here](https://github.com/stakwork/sphinx-relay)

# Relay Light
**Relay Light** is an Electron UI wrapper around **Relay**. Its purpose is to allow users to connect to an **already existing** Lighting Network Node in order to use Sphinx Chat.

### Before You Begin
Make sure that your LN Node is correctly configured and up to date.
Both `synced_to_chain` and `synced_to_graph` must be set to `true`.
```
$ lncli getinfo
{
    ...
    "alias": "bitcoincore.tech",
    "num_active_channels": 1,
    "num_peers": 3,
    ...
    "synced_to_chain": true,
    "synced_to_graph": true,
    "testnet": false,
    "chains": [
        {
            "chain": "bitcoin",
            "network": "mainnet"
        }
    ],
```

Next check that your LN wallet is unlocked and that it has funds.
```
$ lncli walletbalance
{
    "total_balance": "19521952",
    "confirmed_balance": "19521952",
    "unconfirmed_balance": "0"
}

```


Check that you can reach the Sphinx LN Node. It is not mandatory to have a path to this node, but many other participants will likely have one.
```
$ lncli queryroutes --dest 023d70f2f76d283c6c4e58109ee3a2816eb9d8feb40b23d62469060a2b2867b77f --amt 10
{
    "routes": [
        {
            "total_time_lock": 677028,
            ....
        }
    ],
    "success_prob": 0.8346682227708259
}
```

## Config
Simply open the application and provide the connection info for your Lighting Network Node, then click **(Re)connect**

![e1](https://user-images.githubusercontent.com/65119838/112992792-2ef3e580-9171-11eb-908b-3b27ff8f48bb.gif)

## Connect Sphinx!

