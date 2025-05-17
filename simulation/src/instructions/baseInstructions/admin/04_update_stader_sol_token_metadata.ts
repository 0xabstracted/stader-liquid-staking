
import { Connection, PublicKey, sendAndConfirmTransaction, Signer, SystemProgram, SYSVAR_RENT_PUBKEY } from "@solana/web3.js";
import { 
    contractAddr, 
    programDevnet as program,
    // program,
    TOKEN_METADATA_PROGRAM_ID 
} from "../../../config";
import { UpdateStaderSolTokenMetadata } from "../../../types/basicInstructionTypes";


export const update_stader_sol_token_metadata = async (connection: Connection, payer: Signer, updateMetadataParams: UpdateStaderSolTokenMetadata) => {
    const {
        stateAccount,
        staderSolMint,
        name,
        symbol,
        uri
    } = updateMetadataParams;
    const [authorityStaderSolAcc] = PublicKey.findProgramAddressSync([stateAccount.publicKey.toBuffer(), Buffer.from("st_mint")], contractAddr);
    const [metadataPDA, _] = await PublicKey.findProgramAddressSync(
        [
          Buffer.from('metadata'),
          TOKEN_METADATA_PROGRAM_ID.toBuffer(),
          staderSolMint.toBuffer(),
        ],
        TOKEN_METADATA_PROGRAM_ID
      );
    const tx = await program.methods
        .updateStaderSolTokenMetadata(name, symbol, uri)
        .accounts({
            payer: payer.publicKey,
            state: stateAccount.publicKey,
            staderSolMint: staderSolMint,
            staderSolMintAuthority: authorityStaderSolAcc,
            staderSolMintMetadataAccount: metadataPDA,
            rent: SYSVAR_RENT_PUBKEY,
            systemProgram: SystemProgram.programId,
            metadataProgram: TOKEN_METADATA_PROGRAM_ID,
        })
        .transaction()


    tx.feePayer = payer.publicKey;
    tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

    const simulationResult = await connection.simulateTransaction(tx);
    console.log("Simulation Result:", simulationResult);

    const sig = await sendAndConfirmTransaction(connection, tx, [payer]);
    console.log("Transaction Signature:", sig);
}