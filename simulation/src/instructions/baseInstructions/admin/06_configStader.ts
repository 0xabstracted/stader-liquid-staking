
import { Connection, sendAndConfirmTransaction, Signer } from "@solana/web3.js";
import { 
    programDevnet as program,
    // program,
    stateAccount,
} from "../../../config";
import { ConfigStaderParam } from "../../../types";

export const configStader = async (connection: Connection, admin: Signer, configStaderParam: ConfigStaderParam) => {
    const tx = await program.methods.configStader(configStaderParam)
        .accounts({
            state: stateAccount,
            adminAuthority: admin.publicKey,
        })
        .signers([admin])
        .transaction()

    // Set fee payer and recent blockhash
    tx.feePayer = admin.publicKey;
    tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

    // Simulate the transaction to catch errors
    // const simulationResult = await connection.simulateTransaction(tx);
    // console.log("Simulation Result:", simulationResult);

    // Send the transaction
    const sig = await sendAndConfirmTransaction(
        connection, 
        tx, 
        [admin],
        {
            skipPreflight: true,
        },
    );
    console.log("Config Stader Transaction Signature:", sig);
}

//? Define the parameters for initializing the state
// interface DepositParam {
//     amount : BN
// }
