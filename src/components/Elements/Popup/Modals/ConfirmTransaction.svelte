<script>
  import { onMount, getContext, afterUpdate } from "svelte";
  import { _ } from "svelte-i18n";
  import Select from "../../Select";

  import {
    shortAddress,
    sendRequestReject,
    sendRequestResolve,
  } from "../../../../common/utils.js";

  let allNetworks = [];
  let icon = "/assets/img/icon-ever-128.png";
  let symbol = $currentNetwork.coinName;
  let title = $_("Native");

  export let modalData = {};
  let loading = false;
  let disabled = false;

  onMount(() => {
    browser.runtime
      .sendMessage({ type: "getAllNetworks", data: {} })
      .then((result) => {
        allNetworks = result;
      });
    if (modalData.txData.type == "sendToken") {
      icon = modalData.txData.params.token.icon;
      symbol = modalData.txData.params.token.symbol;
      title = modalData.txData.params.token.name;
    }
  });

  //Stores
  import {
    accountStore,
    currentAccount,
    currentNetwork,
  } from "../../../../common/stores.js";

  import { fromNano } from "../../../../common/utils.js";

  //Components
  import { Field, Button, Input } from "svelte-chota";

  //Context
  const { closeModal, openModal } = getContext("app_functions");

  const cancelTransaction = () => {
    closeModal();
    // send a message that the request is rejected for InPage script
    if (modalData.id) {
      sendRequestReject(modalData.id);
    }
  };

  const confirmTransaction = () => {
    loading = true;
    disabled = true;
    browser.runtime
      .sendMessage({
        type: "runTransaction",
        data: modalData,
      })
      .then((result) => {
        //here need to set by default for the next same window
        loading = false;
        disabled = false;
        closeModal();
        if (result.error) {
          openModal("ModalError", { message: result.error });
          if (modalData.id) {
            sendRequestResolve(modalData.id, {
              code: 4300,
              message: result.error,
            });
          }
        } else {
          // send a message that the request is rejected for InPage script
          if (modalData.id) {
            sendRequestResolve(modalData.id, { code: 4000, data: result });
          }
          browser.runtime
            .sendMessage({
              type: "getCurrentBalance",
              data: {
                accountAddress: $currentAccount.address,
                server: $currentNetwork.server,
              },
            })
            .then((result) => {
              const newCurrentAccount = $currentAccount;
              newCurrentAccount.balance[$currentNetwork.server] = result;
              accountStore.changeAccount(newCurrentAccount);
            })
            .catch((e) => {
              console.log(e); // here don't need to show any error for user, usually it is the network issue in the development environment
            });
        }
      });
  };
</script>

<style>
  .title {
    margin: 0px;
  }
  .token-logo {
    width: 48px;
    height: 48px;
    border: var(--color-black) dashed 1px;
    margin: 0.5rem;
    border-radius: 50%;
  }
</style>

<div class="sending-tx flex-column">
  <h6 class="title">{$_('Send transaction')}</h6>
  <div class="is-center">
    <img alt="logo" class="token-logo" src="{icon}"/><br/>
    <span title="{title}">{symbol}</span>
  </div>
  <div class="flex-row flex-center-center">
    {$_('Server')}:
    {#each allNetworks as network}
      {#if network.server == modalData.server}{network.name}{/if}
    {/each}
  </div>
  <div class="flex-row">
    <div class="flex-column input-box-50 flex-center-center">
      <span class="weight-500">{$_('Amount')}</span>
      <span>{fromNano(modalData.txData.params.amount)}</span>
    </div>
    <div class="flex-column input-box-50 flex-center-center">
      <span class="weight-500">{$_('Fee')}</span>
      <span>~ {modalData.fee}</span>
    </div>
  </div>
  <div class="flex-row">
    <div class="flex-column input-box-50 flex-center-center">
      <span class="weight-500">{$_('Address')}</span>
      <span>{shortAddress(modalData.accountAddress)}</span>
    </div>
    <div class="flex-column input-box-50 flex-center-center">
      <span class="weight-500">{$_('Destination')}</span>
      <span>{shortAddress(modalData.txData.params.destination)}</span>
    </div>
  </div>
  <div class="flex-row flex-center-center">
    <div class="flex-column flex-center-center">
      <span class="weight-500">{$_('Message')}</span>
      <span class="message">{modalData.txData.params.message}</span>
    </div>
  </div>
  <div class="flex-row flow-buttons">
    <Button
      id="cancel-btn"
      class="button__solid button__secondary"
      {disabled}
      on:click={() => cancelTransaction()}>
      {$_('Cancel')}
    </Button>
    <Button
      id="save-btn"
      class="button__solid button__primary"
      {loading}
      on:click={() => confirmTransaction()}>
      {$_('Send')}
    </Button>
  </div>
</div>
